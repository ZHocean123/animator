var __extends =
  (this && this.__extends) ||
  (function() {
    var extendStatics = function(d, b) {
      extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function(d, b) {
            d.__proto__ = b;
          }) ||
        function(d, b) {
          for (var p in b)
            if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
        };
      return extendStatics(d, b);
    };
    return function(d, b) {
      if (typeof b !== "function" && b !== null)
        throw new TypeError(
          "Class extends value " + String(b) + " is not a constructor or null"
        );
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype =
        b === null
          ? Object.create(b)
          : ((__.prototype = b.prototype), new __());
    };
  })();
var __spreadArray =
  (this && this.__spreadArray) ||
  function(to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
var path = require("path");
var lodash = require("lodash");
var pretty = require("pretty");
var async = require("async");
var jss = require("json-stable-stringify");
var pascalcase = require("pascalcase");
var PlaybackFlag = require("@haiku/core/lib/HaikuTimeline.js").PlaybackFlag;
var _a = require("@haiku/core/lib/HaikuElement.js"),
  HAIKU_ID_ATTRIBUTE = _a.HAIKU_ID_ATTRIBUTE,
  HAIKU_LOCKED_ATTRIBUTE = _a.HAIKU_LOCKED_ATTRIBUTE,
  HAIKU_TITLE_ATTRIBUTE = _a.HAIKU_TITLE_ATTRIBUTE,
  HAIKU_VAR_ATTRIBUTE = _a.HAIKU_VAR_ATTRIBUTE;
var _b = require("@haiku/core/lib/HaikuComponent.js"),
  HaikuComponent = _b.default,
  clone = _b.clone;
var LAYOUT_3D_SCHEMA = require("@haiku/core/lib/HaikuComponent.js")
  .LAYOUT_3D_SCHEMA;
var HaikuDOMAdapter = require("@haiku/core/lib/adapters/dom.js").default;
var getSortedKeyframes = require("@haiku/core/lib/helpers/KeyframeUtils.js")
  .getSortedKeyframes;
var _c = require("@haiku/core/lib/helpers/interactionModes.js"),
  InteractionMode = _c.InteractionMode,
  isPreviewMode = _c.isPreviewMode;
var Layout3D = require("@haiku/core/lib/Layout3D.js");
var BaseModel = require("./BaseModel");
var logger = require("./../utils/LoggerInstance");
var CryptoUtils = require("./../utils/CryptoUtils");
var ensureTrailingSlash = require("../utils/ensureTrailingSlash");
var toTitleCase = require("./helpers/toTitleCase");
var _d = require("haiku-common/lib/experiments.js"),
  Experiment = _d.Experiment,
  experimentIsEnabled = _d.experimentIsEnabled;
var Lock = require("./Lock");
var SustainedWarningChecker = require("haiku-common/lib/sustained-checker/SustainedWarningChecker")
  .default;
var KEYFRAME_MOVE_DEBOUNCE_TIME = 100;
var CHECK_SUSTAINED_WARNINGS_DEBOUNCE_TIME = 1000;
var DEFAULT_SCENE_NAME = "main"; // e.g. code/main/*
var DEFAULT_INTERACTION_MODE = InteractionMode.EDIT;
var DEFAULT_TIMELINE_NAME = "Default";
var DEFAULT_TIMELINE_TIME = 0;
var HAIKU_SOURCE_ATTRIBUTE = "haiku-source";
var SYNC_LOCKED_ID_SUFFIX = "#lock";
var SELECTION_WAIT_TIME = 0;
var SELECTION_PING_TIME = 100;
var isNumeric = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};
var describeHotComponent = function(
  componentId,
  timelineName,
  timelineTime,
  propertyGroup
) {
  // If our keyframe is not at t = 0, we don't actually need a hot component because we are definitely working with
  // a "mutable"-looking component. We have to cast a number because we sometimes arrive at this
  // point by looping over object properties, whose keyframeMs value JavaScript casts to string
  if (Number(timelineTime) !== 0) {
    return null;
  }
  return {
    selector: "haiku:".concat(componentId),
    propertyNames: Array.isArray(propertyGroup)
      ? propertyGroup
      : Object.keys(propertyGroup),
    timelineName: timelineName
  };
};
var keyframeUpdatesToHotComponentDescriptors = function(keyframeUpdates) {
  var hotComponentDescriptors = [];
  for (var timelineName in keyframeUpdates) {
    for (var componentId in keyframeUpdates[timelineName]) {
      for (var propertyName in keyframeUpdates[timelineName][componentId]) {
        for (var keyframeMs in keyframeUpdates[timelineName][componentId][
          propertyName
        ]) {
          var hotComponent = describeHotComponent(
            componentId,
            timelineName,
            keyframeMs,
            [propertyName]
          );
          if (hotComponent) {
            hotComponentDescriptors.push(hotComponent);
          }
        }
      }
    }
  }
  return hotComponentDescriptors;
};
/**
 * @class ActiveComponent
 * @description
 *  Encapsulates and consolidates code to edit a live in-stage component.
 *  TODO: This should just be called 'Component' or 'LiveComponent' or something, with
 *  only one of them being "active" at a certain point in time.
 *  For now, the logic of who is/isn't active is managed by Project.
 */
var ActiveComponent = /** @class */ (function(_super) {
  __extends(ActiveComponent, _super);
  function ActiveComponent(props, opts) {
    var _this = _super.call(this, props, opts) || this;
    if (!_this.scenename) {
      _this.scenename = DEFAULT_SCENE_NAME;
    }
    _this.snapshots = [];
    // The MountElement abstracts over the actual DOM element into which
    // the component gets mounted. It's convenient to have this object since
    // we might be running in a situation where there is no DOM.
    _this.mount = MountElement.upsert({
      uid: _this.getPrimaryKey(),
      component: _this,
      project: _this.project
    });
    _this.mount.on("update", function(what) {
      _this.emit("update", what, _this.mount);
    });
    // Representing the visual bounding box on the stage
    _this.artboard = Artboard.upsert({
      uid: _this.getPrimaryKey(),
      component: _this,
      project: _this.project,
      mount: _this.mount
    });
    _this.artboard.on("update", function(what) {
      _this.emit("update", what, _this.artboard);
    });
    _this.marquee = SelectionMarquee.upsert({
      uid: _this.getPrimaryKey(),
      component: _this,
      artboard: _this.artboard
    });
    _this.project.addActiveComponentToRegistry(_this);
    // Used to control how we render in an editing environment, e.g. preview mode
    _this.interactionMode = DEFAULT_INTERACTION_MODE;
    Element.on("update", function(element, what, metadata) {
      if (element.component === _this) {
        if (what === "element-selected" || what === "element-selected-softly") {
          _this.handleElementSelected(element.getComponentId(), metadata);
        } else if (
          what === "element-unselected" ||
          what === "element-unselected-softly"
        ) {
          _this.handleElementUnselected(element.getComponentId(), metadata);
        } else if (what === "element-hovered") {
          _this.handleElementHovered(element.getComponentId(), metadata);
        } else if (what === "element-unhovered") {
          _this.handleElementUnhovered(element.getComponentId(), metadata);
        } else if (
          what === "jit-property-added" ||
          what === "jit-property-removed"
        ) {
          _this.reload(
            {
              hardReload: true,
              clearCacheOptions: {
                doClearEntityCaches: true
              }
            },
            {},
            function() {}
          );
        }
        _this.emit("update", what, element, metadata);
      }
    });
    Row.on("update", function(row, what) {
      if (row.component === _this) {
        _this.emit("update", what, row, _this.project.getMetadata());
        if (what === "row-collapsed" || what === "row-expanded") {
          _this.cache.unset("displayableRows");
        }
      }
    });
    Keyframe.on("update", function(keyframe, what) {
      if (keyframe.component === _this) {
        _this.emit("update", what, keyframe, _this.project.getMetadata());
      }
    });
    _this.commitAccumulatedKeyframeMovesDebounced = lodash.debounce(
      _this.commitAccumulatedKeyframeMoves.bind(_this),
      KEYFRAME_MOVE_DEBOUNCE_TIME
    );
    return _this;
  }
  ActiveComponent.prototype.findElementRoot = function() {
    for (var _i = 0, _a = Element.findRoots(); _i < _a.length; _i++) {
      var element = _a[_i];
      if (element.component.uid === this.uid) {
        return element;
      }
    }
    return null;
  };
  ActiveComponent.prototype.queryElements = function(criteria) {
    if (!criteria) {
      criteria = {};
    }
    criteria.component = this; // Only query elements that belong to us
    return Element.where(criteria);
  };
  ActiveComponent.prototype.findRowByComponentId = function(haikuId) {
    return Row.findByComponentAndHaikuId(this, haikuId);
  };
  ActiveComponent.prototype.findPropertyRowsByParentComponentId = function(
    parentHaikuId
  ) {
    return Row.findPropertyRowsByComponentAndParentHaikuId(this, parentHaikuId);
  };
  ActiveComponent.prototype.findElementByComponentId = function(haikuId) {
    return Element.findByComponentAndHaikuId(this, haikuId);
  };
  ActiveComponent.prototype.locateTemplateNodeByComponentId = function(
    componentId
  ) {
    return this.getTemplateNodesByComponentId()[componentId];
  };
  ActiveComponent.prototype.getTemplateNodesByComponentId = function() {
    var _this = this;
    return this.cache.fetch("getTemplateNodesByComponentId", function() {
      var nodes = {};
      var mana = _this.getReifiedBytecode().template;
      Template.visit(mana, function(node) {
        if (node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE]) {
          nodes[node.attributes[HAIKU_ID_ATTRIBUTE]] = node;
        }
      });
      return nodes;
    });
  };
  ActiveComponent.prototype.findTemplateNodeByComponentId = function(
    mana,
    componentId
  ) {
    if (!mana) {
      return;
    }
    if (
      mana.attributes &&
      mana.attributes[HAIKU_ID_ATTRIBUTE] === componentId
    ) {
      return mana;
    }
    if (Array.isArray(mana.children)) {
      for (var i = 0; i < mana.children.length; i++) {
        var maybeChild = this.findTemplateNodeByComponentId(
          mana.children[i],
          componentId
        );
        if (maybeChild) {
          return maybeChild;
        }
      }
    }
  };
  ActiveComponent.prototype.findElementByUid = function(uid) {
    return Element.findById(uid);
  };
  ActiveComponent.prototype.getCurrentTimelineName = function() {
    // TODO: Support many. When the timeline changes, clear Timeline (bll collection) caches.
    return Timeline.DEFAULT_NAME;
  };
  ActiveComponent.prototype.getCurrentTimelineTime = function() {
    // Although we own multiple instances, assume that they are operating in lockstep during
    // editing; we just need to grab a single 'canonical' one for reference
    var canonicalCoreInstance = this.$instance;
    // In case we get called before fully initialized, e.g. on stage during first load
    if (!canonicalCoreInstance) {
      return 0;
    }
    var canonicalCoreTimeline = canonicalCoreInstance.getTimeline(
      this.getCurrentTimelineName()
    );
    // This should never happen, but just in case, fallback to 0 if no timeline with this name
    if (!canonicalCoreTimeline) {
      return 0;
    }
    var controlledTime = canonicalCoreTimeline.getControlledTime();
    // If time control hasn't been established yet, the controlled time may be null
    return controlledTime || 0;
  };
  ActiveComponent.prototype.getCurrentMspf = function() {
    return 16.666;
  };
  ActiveComponent.prototype.getRelpath = function() {
    return path.join("code", this.getSceneName(), "code.js");
  };
  ActiveComponent.prototype.getLocalizedRelpath = function() {
    return Template.normalizePath("./".concat(this.getRelpath()));
  };
  ActiveComponent.prototype.getSceneCodeFolder = function() {
    return path.join(this.project.getFolder(), "code", this.getSceneName());
  };
  ActiveComponent.prototype.getSceneDomModulePath = function() {
    return path.join("code", this.getSceneName(), "dom.js");
  };
  ActiveComponent.prototype.getRelpathWithRespectToProjectFromPathRelativeToUs = function(
    relpathRelativeToUs
  ) {
    var abspathToGivenPath = path.normalize(
      path.join(this.getSceneCodeFolder(), relpathRelativeToUs)
    );
    var relpathWithRespectToProject = abspathToGivenPath
      .replace(this.project.getFolder(), "")
      .slice(1); // Remove leftover slash
    return relpathWithRespectToProject;
  };
  ActiveComponent.prototype.setSceneName = function(scenename) {
    this.scenename = scenename;
    return this;
  };
  ActiveComponent.prototype.setAsCurrentActiveComponent = function(
    metadata,
    cb
  ) {
    this.project.setCurrentActiveComponent(this.getSceneName(), metadata, cb);
  };
  ActiveComponent.prototype.getSceneName = function() {
    return this.scenename;
  };
  ActiveComponent.prototype.getFriendlySceneName = function(maybeProjectName) {
    var snakename = this.getSceneName();
    if (snakename === DEFAULT_SCENE_NAME) {
      return "".concat(
        this.project.getFriendlyName(maybeProjectName),
        " (Main)"
      );
    }
    return "".concat(toTitleCase(snakename));
  };
  ActiveComponent.prototype.getAbsoluteLottieFilePath = function() {
    return path.join(this.getSceneCodeFolder(), "lottie.json");
  };
  ActiveComponent.prototype.getAbsoluteHaikuStaticFilePath = function() {
    return path.join(this.getSceneCodeFolder(), "static.json");
  };
  ActiveComponent.prototype.fetchActiveBytecodeFile = function() {
    return this.file;
  };
  ActiveComponent.prototype.tick = function() {
    // This guard is to allow headless mode, e.g. in Haiku's timeline application
    if (this.$instance.context && this.$instance.context.tick) {
      this.$instance.context.tick();
    }
  };
  ActiveComponent.prototype.forceFlush = function() {
    this.$instance.markForFullFlush(true);
    this.tick();
  };
  ActiveComponent.prototype.addHotComponents = function(hotComponents) {
    var _this = this;
    hotComponents.forEach(function(hotComponent) {
      // hotComponent may be null if the timeline time was not 0
      if (hotComponent) {
        _this.$instance.addHotComponent(hotComponent);
      }
    });
  };
  ActiveComponent.prototype.clearCaches = function(options) {
    if (options === void 0) {
      options = {};
    }
    this.$instance.clearCaches(options);
    this.fetchRootElement().cache.clear();
    if (options.doClearEntityCaches) {
      this.fetchRootElement().clearEntityCaches();
    }
  };
  ActiveComponent.prototype.getPropertyGroupValueFromPropertyKeys = function(
    componentId,
    timelineName,
    timelineTime,
    propertyKeys
  ) {
    var groupValue = {};
    var bytecode = this.getReifiedBytecode();
    if (!bytecode) {
      return groupValue;
    }
    if (!bytecode.timelines) {
      return groupValue;
    }
    if (!bytecode.timelines[timelineName]) {
      return groupValue;
    }
    if (!bytecode.timelines[timelineName]["haiku:".concat(componentId)]) {
      return groupValue;
    }
    var cluster =
      bytecode.timelines[timelineName]["haiku:".concat(componentId)];
    propertyKeys.forEach(function(propertyKey) {
      if (!cluster[propertyKey]) {
        return;
      }
      if (!cluster[propertyKey][timelineTime]) {
        return;
      }
      groupValue[propertyKey] = cluster[propertyKey][timelineTime].value;
    });
    return groupValue;
  };
  ActiveComponent.prototype.getMountHTML = function() {
    return this.getMount().getInnerHTML();
  };
  ActiveComponent.prototype.htmlSnapshot = function(cb) {
    var html = this.getMountHTML();
    return cb(
      null,
      // Hack: when we exit hot editing mode, ensure that URLs will display correctly on the local machine.
      pretty(html).replace(
        /web\+haikuroot:\/\//g,
        ensureTrailingSlash(this.project.getFolder())
      )
    );
  };
  ActiveComponent.prototype.setCurrentTimelineFrameValue = function(frame) {
    this.getCurrentTimeline().seek(frame, true);
  };
  ActiveComponent.prototype.setTimelineTimeValue = function(
    timelineTime,
    forceSeek
  ) {
    if (forceSeek === void 0) {
      forceSeek = false;
    }
    timelineTime = Math.round(timelineTime);
    // When doing a hard reload (in which we load a fresh component instance from disk)
    // that component will be completely fresh and not yet in 'controlled time' mode, which
    // means that it will initially start playing. Hard reload depends on being able to
    // force set a time value to get it into 'controlled time' mode, hence the `forceSeek` flag.
    if (forceSeek || timelineTime !== this.getCurrentTimelineTime()) {
      // Note that this call reaches in and updates our instance's timeline objects
      Timeline.where({ component: this }).forEach(function(timeline) {
        timeline.seekToTime(timelineTime, true, forceSeek);
      });
      // Perform a lightweight full flush render, recomputing all values without without trying to be clever about
      // which properties have actually changed.
      if (this.$instance.context && this.$instance.context.tick) {
        this.$instance.context.tick(true);
      }
      // Purge any ElementSelectionProxy caches in case the layout of selected elements is changing.
      ElementSelectionProxy.all().forEach(function(proxy) {
        proxy.clearAllRelatedCaches();
        proxy.reinitializeLayout();
      });
    }
  };
  ActiveComponent.prototype.setTitleForComponent = function(
    componentId,
    newTitle,
    metadata,
    cb
  ) {
    var _this = this;
    this.project.updateHook(
      "setTitleForComponent",
      this.getRelpath(),
      componentId,
      newTitle,
      metadata,
      function(fire) {
        return _this.performComponentWork(
          function(bytecode, mana, done) {
            var templateNode = _this.locateTemplateNodeByComponentId(
              componentId
            );
            if (!templateNode) {
              return done(null, "", "");
            }
            if (newTitle) {
              var oldTitle = templateNode.attributes[HAIKU_TITLE_ATTRIBUTE];
              templateNode.attributes[HAIKU_TITLE_ATTRIBUTE] = newTitle;
              return done(null, newTitle, oldTitle);
            }
            return done(
              null,
              templateNode.attributes[HAIKU_TITLE_ATTRIBUTE],
              templateNode.attributes[HAIKU_TITLE_ATTRIBUTE]
            );
          },
          function(err, newTitle, oldTitle) {
            if (err) {
              return cb(err);
            }
            var element = _this.findElementByComponentId(componentId);
            if (element) {
              element.updateTargetingRows("row-set-title");
            }
            fire(null, oldTitle);
            return cb(null, newTitle);
          }
        );
      }
    );
  };
  ActiveComponent.prototype.setLockedStatusForComponent = function(
    componentId,
    locked,
    metadata,
    cb
  ) {
    var _this = this;
    this.project.updateHook(
      "setLockedStatusForComponent",
      this.getRelpath(),
      componentId,
      locked,
      metadata,
      function(fire) {
        return _this.performComponentWork(
          function(bytecode, mana, done) {
            var templateNode = _this.locateTemplateNodeByComponentId(
              componentId
            );
            if (!templateNode) {
              return done(null, "", "");
            }
            var oldStatus = templateNode.attributes[HAIKU_LOCKED_ATTRIBUTE];
            templateNode.attributes[HAIKU_LOCKED_ATTRIBUTE] = locked;
            return done(null, locked, oldStatus);
          },
          function(err, locked, oldStatus) {
            if (err) {
              return cb(err);
            }
            var element = _this.findElementByComponentId(componentId);
            if (element) {
              element.updateTargetingRows("row-set-locked");
            }
            fire(null, oldStatus);
            return cb(null, locked);
          }
        );
      }
    );
  };
  /**
   * @method handleElementSelected
   * @description Hook to call once an element in-memory has been selected.
   * This is responsible for notifying other views about the action, and emitting an event that others can listen to.
   * The metadata arg is important because it has info about who originated the message, allowing us to avoid infinite loop.
   * Note: This gets called automatically by element.select()
   */
  ActiveComponent.prototype.handleElementSelected = function(
    componentId,
    metadata
  ) {
    metadata.integrity = false;
    this.project.updateHook(
      "selectElement",
      this.getRelpath(),
      componentId,
      metadata,
      function(fire) {
        return fire();
      }
    );
  };
  /**
   * @method handleElementUnselected
   * @description Hook to call once an element in-memory has been unselected.
   * This is responsible for notifying other views about the action, and emitting an event that others can listen to.
   * The metadata arg is important because it has info about who originated the message, allowing us to avoid infinite loop.
   * Note: This gets called automatically by element.unselect()
   */
  ActiveComponent.prototype.handleElementUnselected = function(
    componentId,
    metadata
  ) {
    metadata.integrity = false;
    this.project.updateHook(
      "unselectElement",
      this.getRelpath(),
      componentId,
      metadata,
      function(fire) {
        return fire();
      }
    );
  };
  ActiveComponent.prototype.handleElementHovered = function(
    componentId,
    metadata
  ) {
    metadata.integrity = false;
    this.project.updateHook(
      "hoverElement",
      this.getRelpath(),
      componentId,
      metadata,
      function(fire) {
        return fire();
      }
    );
  };
  ActiveComponent.prototype.handleElementUnhovered = function(
    componentId,
    metadata
  ) {
    metadata.integrity = false;
    this.project.updateHook(
      "unhoverElement",
      this.getRelpath(),
      componentId,
      metadata,
      function(fire) {
        return fire();
      }
    );
  };
  ActiveComponent.prototype.getTopLevelElementHaikuIds = function() {
    var template = this.getReifiedBytecode().template;
    var children = (template && template.children) || [];
    return children
      .map(function(child) {
        return (
          child && child.attributes && child.attributes[HAIKU_ID_ATTRIBUTE]
        );
      })
      .filter(function(id) {
        return !!id;
      });
  };
  ActiveComponent.prototype.selectElementWithinTime = function(
    waitTime,
    componentId,
    metadata,
    cb
  ) {
    var _this = this;
    var element = Element.findByComponentAndHaikuId(this, componentId);
    // If we don't initially find the element, wait up to `waitTime` to see if it appears
    // Race conditions with instantiate can cause this to happen
    if (!element) {
      if (waitTime <= 0) {
        // Is it better to throw here?
        return cb();
      }
      return setTimeout(function() {
        return _this.selectElementWithinTime(
          waitTime - SELECTION_PING_TIME,
          componentId,
          metadata,
          cb
        );
      }, SELECTION_PING_TIME);
    }
    element.select(metadata);
    cb();
  };
  ActiveComponent.prototype.selectAll = function(options, metadata, cb) {
    var _this = this;
    return Lock.request(Lock.LOCKS.ActiveComponentWork, false, function(
      release
    ) {
      _this
        .getArtboard()
        .getElement()
        .children.forEach(function(element) {
          if (element.isLocked()) {
            return;
          }
          element.selectSoftly(metadata);
        });
      release();
      _this.project.updateHook(
        "selectAll",
        _this.getRelpath(),
        options,
        metadata,
        function(fire) {
          return fire();
        }
      );
      return cb();
    });
  };
  ActiveComponent.prototype.selectElement = function(
    componentId,
    metadata,
    cb
  ) {
    return this.selectElementWithinTime(
      SELECTION_WAIT_TIME,
      componentId,
      metadata,
      function() {
        return cb(); // Must return or the plumbing action circuit never completes
      }
    );
  };
  ActiveComponent.prototype.unselectElementWithinTime = function(
    waitTime,
    componentId,
    metadata,
    cb
  ) {
    var _this = this;
    var element = Element.findByComponentAndHaikuId(this, componentId);
    if (!element) {
      if (waitTime <= 0) {
        // Is it better to throw here?
        return cb();
      }
      return setTimeout(function() {
        return _this.unselectElementWithinTime(
          waitTime - SELECTION_PING_TIME,
          componentId,
          metadata,
          cb
        );
      }, SELECTION_PING_TIME);
    }
    element.unselect(metadata);
    return cb();
  };
  ActiveComponent.prototype.unselectElement = function(
    componentId,
    metadata,
    cb
  ) {
    return this.unselectElementWithinTime(
      SELECTION_WAIT_TIME,
      componentId,
      metadata,
      function() {
        return cb(); // Must return or the plumbing action circuit never completes
      }
    );
  };
  ActiveComponent.prototype.hoverElement = function(componentId, metadata, cb) {
    var element = Element.findByComponentAndHaikuId(this, componentId);
    if (element) {
      element.hoverOn(metadata);
    }
    return cb();
  };
  ActiveComponent.prototype.unhoverElement = function(
    componentId,
    metadata,
    cb
  ) {
    var element = Element.findByComponentAndHaikuId(this, componentId);
    if (element) {
      element.hoverOff(metadata);
    }
    return cb();
  };
  ActiveComponent.prototype.isPreviewModeActive = function() {
    return isPreviewMode(this.interactionMode);
  };
  /**
   * @method setInteractionMode
   * @description Changes the current interaction mode and flushes all cachés
   */
  ActiveComponent.prototype.setInteractionMode = function(interactionMode, cb) {
    this.interactionMode = interactionMode;
    return this.reload(
      {
        superficial: true,
        clearCacheOptions: {
          doClearEntityCaches: true
        }
      },
      null,
      cb
    );
  };
  /**
   * @method setHotEditingMode
   * @description Changes the current hot-editing mode setting.
   * Used by Glass when playing the component using the "play" button.
   */
  ActiveComponent.prototype.setHotEditingMode = function(hotEditingMode) {
    this.$instance.assignConfig({ hotEditingMode: hotEditingMode });
  };
  ActiveComponent.prototype.getInsertionPointInfo = function(nonce) {
    if (nonce === void 0) {
      nonce = 0;
    }
    var bytecode = this.getReifiedBytecode();
    var mana = bytecode && bytecode.template;
    var index = (mana && mana.children && mana.children.length) || 0;
    var template =
      mana &&
      Template.manaWithOnlyMinimalProps(mana, function() {
        return {};
      });
    var source = jss(template) + "-" + index + "-" + nonce;
    var hash = Template.getHash(source, 6);
    return {
      template: template,
      source: source,
      hash: hash
    };
  };
  ActiveComponent.prototype.getInsertionPointHash = function() {
    return this.getInsertionPointInfo().hash;
  };
  /**
   * @method doesMatchOrHostComponent
   * @description Detect whether we contain other in our tree or in the subtrees of
   * any components that we host, or whether we are a match for other.
   */
  ActiveComponent.prototype.doesMatchOrHostComponent = function(other, cb) {
    if (other === this) {
      return cb(null, true);
    }
    if (
      Template.normalizePath(other.getRelpath()) ===
      Template.normalizePath(this.getRelpath())
    ) {
      return cb(null, true);
    }
    return cb(
      null,
      Bytecode.doesMatchOrHostBytecode(
        this.getReifiedBytecode(),
        other.getReifiedBytecode(),
        undefined
      )
    );
  };
  /**
   * @method instantiateReference
   * @description Instantiate a component by reference, i.e., using a module path
   * that points to that component using a require()-compatible path.
   * @param identifier {String} Identifier (variable) name to write to the AST
   * @param modpath {String} require()-compatible path to a module
   * @param coords {Object} Coordinates of the instantiatee
   * @param overrides {Object} Overrides to apply to the timeline [unused]
   * @param metadata {Object} Signal metadata
   * @param cb {Function}
   */
  ActiveComponent.prototype.instantiateReference = function(
    subcomponent,
    identifier,
    modpath,
    coords,
    overrides,
    metadata,
    cb
  ) {
    var _this = this;
    return subcomponent.doesMatchOrHostComponent(this, function(err, answer) {
      if (err) {
        return cb(err);
      }
      if (answer) {
        return cb(new Error("You cannot place a component within itself"));
      }
      var fullpath;
      var isExternalModule = modpath[0] !== ".";
      if (!isExternalModule) {
        fullpath = path.join(_this.project.getFolder(), modpath); // Expected to be ./*
      } else {
        fullpath = modpath;
      }
      var file = isExternalModule
        ? PseudoFile.upsert({ relpath: modpath })
        : _this.project.upsertFile({
            relpath: modpath,
            folder: _this.project.getFolder()
          });
      // This assumes that the file has already been written to the file system or
      // stored inside the module require.cache via an earlier hook
      var mod = ModuleWrapper.upsert({
        uid: fullpath,
        isExternalModule: isExternalModule,
        component: subcomponent,
        file: file
      });
      var title = subcomponent.getTitle();
      return mod.moduleAsMana(_this.getRelpath(), identifier, title, function(
        err,
        manaForWrapperElement
      ) {
        if (err) {
          return cb(err);
        }
        if (!manaForWrapperElement) {
          return cb(
            new Error("Module ".concat(fullpath, " could not be imported"))
          );
        }
        _this.instantiateManaInBytecode(
          manaForWrapperElement,
          _this.getReifiedBytecode(),
          overrides,
          coords
        );
        return cb(null, manaForWrapperElement);
      });
    });
  };
  ActiveComponent.prototype.getTitle = function() {
    return pascalcase(this.getSceneName());
  };
  ActiveComponent.prototype.getAbspath = function() {
    return path.join(this.project.getFolder(), this.getRelpath());
  };
  ActiveComponent.prototype.fetchTimelinePropertyFromComponentElement = function(
    mana,
    propertyName
  ) {
    if (!mana.elementName) {
      return;
    }
    if (!mana.elementName.template) {
      return;
    }
    if (!mana.elementName.template.attributes) {
      return;
    }
    if (!mana.elementName.template.elementName) {
      return;
    }
    return TimelineProperty.getComputedValue(
      mana.elementName.template.attributes[HAIKU_ID_ATTRIBUTE],
      mana.elementName.template.elementName,
      propertyName,
      this.getCurrentTimelineName(),
      this.getCurrentTimelineTime(),
      0,
      mana.elementName,
      mana.__memory && mana.__memory.subcomponent, // can be undefined
      mana.__memory &&
        mana.__memory.subcomponent &&
        mana.__memory.subcomponent.state
    );
  };
  ActiveComponent.prototype.instantiateManaInBytecode = function(
    mana,
    bytecode,
    overrides,
    coords
  ) {
    var hash = this.getInsertionPointInfo(0).hash;
    var timelineName = this.getInstantiationTimelineName();
    var timelineTime = this.getInstantiationTimelineTime();
    var timelines = Template.prepareManaAndBuildTimelinesObject(
      mana,
      hash,
      timelineName,
      timelineTime,
      { doHashWork: true }
    );
    // Has to happen after the above stanza in case an id was generated
    var componentId = mana.attributes[HAIKU_ID_ATTRIBUTE];
    logger.info(
      "[active component ("
        .concat(this.project.getAlias(), ")] instantiatee (mana) ")
        .concat(componentId, " via ")
        .concat(hash)
    );
    // Used to be `.push` but it makes more sense to put at the top of the list,
    // so that it displays on top of other elements in the stack display
    bytecode.template.children.unshift(mana);
    this.mutateInstantiateeDisplaySettings(
      componentId,
      timelines,
      timelineName,
      timelineTime,
      mana,
      coords
    );
    Bytecode.applyOverrides(
      overrides,
      timelines,
      timelineName,
      "haiku:".concat(componentId),
      timelineTime
    );
    Bytecode.mergeTimelines(bytecode.timelines, timelines);
    // And move the element to the z-front of all the rest of the layers
    // This must be part of this atomic action or undo/redo won't work properly
    // This has to happen after we merge the timeline structure or the object will be overwritten
    this.zMoveToFrontImpl(bytecode, componentId, timelineName, timelineTime);
    return componentId;
  };
  /**
   * @method instantiateMana
   * @description Given a chunk of 'mana' data, instantiate that 'mana' into
   * our component's template object
   * @param mana {Object} Chunk of 'mana' data to instantiate
   * @param overrides {Object} Overrides to apply to the timeline [unused]
   * @param metadata {Object} Signal metadata
   * @param cb {Function}
   */
  ActiveComponent.prototype.instantiateMana = function(
    mana,
    bytecode,
    coords,
    metadata,
    cb
  ) {
    this.instantiateManaInBytecode(mana, bytecode, {}, coords);
    return cb(null, mana);
  };
  ActiveComponent.prototype.getInstantiationTimelineName = function() {
    return Timeline.DEFAULT_NAME;
  };
  ActiveComponent.prototype.getInstantiationTimelineTime = function() {
    return 0;
  };
  ActiveComponent.prototype.getMergeDesignTimelineName = function() {
    return Timeline.DEFAULT_NAME;
  };
  ActiveComponent.prototype.getMergeDesignTimelineTime = function() {
    return 0;
  };
  ActiveComponent.prototype.createInTransitionInTimelineObject = function(
    timelineObj,
    propertyName,
    fromTime,
    fromValue,
    toTime,
    toValue,
    curveName
  ) {
    if (!timelineObj[propertyName]) {
      timelineObj[propertyName] = {};
    }
    if (!timelineObj[propertyName][fromTime]) {
      timelineObj[propertyName][fromTime] = {};
    }
    timelineObj[propertyName][fromTime].value = fromValue;
    if (curveName) {
      timelineObj[propertyName][fromTime].curve = curveName;
    }
    if (!timelineObj[propertyName][toTime]) {
      timelineObj[propertyName][toTime] = {};
    }
    timelineObj[propertyName][toTime].value = toValue;
  };
  ActiveComponent.prototype.mutateInstantiateeDisplaySettings = function(
    componentId,
    timelinesObject,
    timelineName,
    timelineTime,
    templateObject,
    maybeCoords
  ) {
    // This method depends on being able to fetch data from the component instance,
    // so we call render here to ensure all the instances in the tree are bootstrapped
    var instance = this.$instance;
    if (instance) {
      instance.context.getContainer(true); // Force recalc of container for correct sizing
      instance.render(); // Flush a tree, ensuring new components are initialized
    }
    var insertedTimeline =
      timelinesObject[this.getCurrentTimelineName()][
        "haiku:".concat(componentId)
      ] || {};
    // If instantiated at a time greater than 0, make the element invisible
    // until the playhead time at which was instantiated on the stage
    if (timelineTime > 0) {
      this.createInTransitionInTimelineObject(
        insertedTimeline,
        "opacity",
        0,
        0,
        timelineTime,
        1,
        null
      );
    }
    // If the child being instantiated has a set size, set ours to the same
    // so the transform controls line up when it's selected on stage
    if (
      templateObject.elementName &&
      typeof templateObject.elementName === "object"
    ) {
      var sizeAbsoluteX = this.fetchTimelinePropertyFromComponentElement(
        templateObject,
        "sizeAbsolute.x"
      );
      if (sizeAbsoluteX) {
        if (!insertedTimeline["sizeAbsolute.x"]) {
          insertedTimeline["sizeAbsolute.x"] = {};
        }
        if (!insertedTimeline["sizeAbsolute.x"][timelineTime]) {
          insertedTimeline["sizeAbsolute.x"][timelineTime] = {};
        }
        insertedTimeline["sizeAbsolute.x"][timelineTime].value =
          Layout3D.AUTO_SIZING_TOKEN;
        // The default size mode is proportional, so if we received an absolute size, we have to override the mode
        if (!insertedTimeline["sizeMode.x"]) {
          insertedTimeline["sizeMode.x"] = {};
        }
        if (!insertedTimeline["sizeMode.x"][timelineTime]) {
          insertedTimeline["sizeMode.x"][timelineTime] = {};
        }
        insertedTimeline["sizeMode.x"][timelineTime].value =
          Layout3D.SIZE_ABSOLUTE;
      }
      var sizeAbsoluteY = this.fetchTimelinePropertyFromComponentElement(
        templateObject,
        "sizeAbsolute.y"
      );
      if (sizeAbsoluteY) {
        if (!insertedTimeline["sizeAbsolute.y"]) {
          insertedTimeline["sizeAbsolute.y"] = {};
        }
        if (!insertedTimeline["sizeAbsolute.y"][timelineTime]) {
          insertedTimeline["sizeAbsolute.y"][timelineTime] = {};
        }
        insertedTimeline["sizeAbsolute.y"][timelineTime].value =
          Layout3D.AUTO_SIZING_TOKEN;
        // The default size mode is proportional, so if we received an absolute size, we have to override the mode
        if (!insertedTimeline["sizeMode.y"]) {
          insertedTimeline["sizeMode.y"] = {};
        }
        if (!insertedTimeline["sizeMode.y"][timelineTime]) {
          insertedTimeline["sizeMode.y"][timelineTime] = {};
        }
        insertedTimeline["sizeMode.y"][timelineTime].value =
          Layout3D.SIZE_ABSOLUTE;
      }
    }
    if (maybeCoords !== undefined && maybeCoords !== null) {
      var propertyGroup = {};
      var _a = this.getContextSizeActual(timelineName, timelineTime),
        width = _a.width,
        height = _a.height;
      if (maybeCoords && typeof maybeCoords.x === "number") {
        propertyGroup["translation.x"] = maybeCoords.x;
      } else {
        propertyGroup["translation.x"] = width / 2;
      }
      if (maybeCoords && typeof maybeCoords.y === "number") {
        propertyGroup["translation.y"] = maybeCoords.y;
      } else {
        propertyGroup["translation.y"] = height / 2;
      }
      TimelineProperty.addPropertyGroup(
        timelinesObject,
        timelineName,
        componentId,
        Element.safeElementName(templateObject),
        propertyGroup,
        timelineTime
      );
    }
  };
  /**
   * @method unconglomerateComponent
   */
  ActiveComponent.prototype.unconglomerateComponent = function(
    componentIds,
    name,
    size,
    translation,
    coords,
    propertiesSerial,
    options,
    metadata,
    cb
  ) {
    var _this = this;
    if (options === void 0) {
      options = {};
    }
    Lock.request(Lock.LOCKS.ActiveComponentWork, false, function(release) {
      return _this.project.updateHook(
        "unconglomerateComponent",
        _this.getRelpath(),
        // Note that we only actually need the name of the component we're unconglomerating to do the unconglomeration.
        // The reason for all these params is so we can also REDO.
        componentIds,
        name,
        size,
        translation,
        coords,
        propertiesSerial,
        options,
        metadata,
        function(fire) {
          _this
            .fetchActiveBytecodeFile()
            .updateInMemoryHotModule(_this.snapshots.pop(), function() {
              _this.project.deleteSceneByName(name, function() {
                release();
                _this.moduleSync(function() {
                  fire();
                  cb();
                });
              });
            });
        }
      );
    });
  };
  /**
   * @method conglomerateComponent
   * @description Given a list of existing component ids on stage, create a component
   * from them and place the result on the stage
   */
  ActiveComponent.prototype.conglomerateComponent = function(
    componentIds,
    name,
    size,
    translation,
    coords,
    propertiesSerial,
    options,
    metadata,
    cb
  ) {
    var _this = this;
    if (options === void 0) {
      options = {};
    }
    var properties = Bytecode.unserializeValue(propertiesSerial, function(ref) {
      return _this.evaluateReference(ref);
    });
    return Lock.request(Lock.LOCKS.ActiveComponentWork, false, function(
      release
    ) {
      return _this.pushBytecodeSnapshot(function() {
        return _this.project.updateHook(
          "conglomerateComponent",
          _this.getRelpath(),
          componentIds,
          name,
          size,
          translation,
          coords,
          Bytecode.serializeValue(properties),
          options,
          metadata,
          function(fire) {
            var finish = function(err, ac) {
              if (err) {
                release();
                logger.error(
                  "[active component (".concat(_this.project.getAlias(), ")]"),
                  err
                );
                return cb(err);
              }
              return _this.reload(
                {
                  hardReload: true,
                  clearCacheOptions: {
                    doClearEntityCaches: true
                  }
                },
                null,
                function() {
                  release();
                  fire();
                  return cb(null, ac);
                }
              );
            };
            return _this.conglomerateComponentActual(
              componentIds,
              name,
              size,
              translation,
              coords,
              properties,
              options,
              metadata,
              finish
            );
          }
        );
      });
    });
  };
  ActiveComponent.prototype.conglomerateComponentActual = function(
    ids,
    name,
    size,
    translation,
    coords,
    properties,
    options,
    metadata,
    cb
  ) {
    var _this = this;
    if (options === void 0) {
      options = {};
    }
    var activeComponentToReturn;
    return this.performComponentWork(
      function(hostBytecode, hostTemplate, done) {
        return _this.project.upsertSceneByName(name, function(
          err,
          newActiveComponent
        ) {
          if (err) {
            return done(err);
          }
          activeComponentToReturn = newActiveComponent;
          // Give the new component the passed-in properties, which includes its size
          var newBytecode = newActiveComponent.getReifiedBytecode();
          newActiveComponent.upsertProperties(
            newBytecode,
            newBytecode.template.attributes[HAIKU_ID_ATTRIBUTE],
            newActiveComponent.getInstantiationTimelineName(),
            newActiveComponent.getInstantiationTimelineTime(),
            lodash.assign({
              "sizeAbsolute.x": size.x,
              "sizeAbsolute.y": size.y
            }),
            "merge"
          );
          ids.forEach(function(id) {
            var element = _this.findElementByComponentId(id);
            // If we can't find this element, we are out of sync and need to crash
            if (!element) {
              throw new Error("Cannot relocate element ".concat(id));
            }
            // Grab the bytecode that will represent the element in the sub-component.
            // We have to do this before deleting the original element or we won't
            // be able to find the node in the current host template
            var elementBytecode = element.getQualifiedBytecode();
            // The size of the group selection is used to determine the size of the artboard
            // of the new component, which means we also have to offset the translations of all
            // children in accordance with their offset within their original artboard
            var elementOffset = {
              "translation.x": translation.x,
              "translation.y": translation.y
            };
            var timelineName = _this.getCurrentTimelineName();
            var selector = Template.buildHaikuIdSelector(
              elementBytecode.template.attributes[HAIKU_ID_ATTRIBUTE]
            );
            if (!elementBytecode.timelines[timelineName][selector]) {
              elementBytecode.timelines[timelineName][selector] = {};
            }
            for (var propertyName in elementOffset) {
              var offsetValue = elementOffset[propertyName];
              if (
                !elementBytecode.timelines[timelineName][selector][propertyName]
              ) {
                elementBytecode.timelines[timelineName][selector][
                  propertyName
                ] = {};
              }
              if (
                !elementBytecode.timelines[timelineName][selector][
                  propertyName
                ][0]
              ) {
                elementBytecode.timelines[timelineName][selector][
                  propertyName
                ][0] = {};
              }
              for (var keyframeMs in elementBytecode.timelines[timelineName][
                selector
              ][propertyName]) {
                var existingValue =
                  elementBytecode.timelines[timelineName][selector][
                    propertyName
                  ][keyframeMs].value || 0;
                var existingCurve =
                  elementBytecode.timelines[timelineName][selector][
                    propertyName
                  ][keyframeMs].curve;
                if (typeof existingValue === "function") {
                  continue;
                }
                var updatedValue = isNumeric(existingValue)
                  ? existingValue - offsetValue
                  : offsetValue;
                elementBytecode.timelines[timelineName][selector][propertyName][
                  keyframeMs
                ] = {
                  value: updatedValue
                };
                if (existingCurve) {
                  elementBytecode.timelines[timelineName][selector][
                    propertyName
                  ][keyframeMs].curve = existingCurve;
                }
              }
            }
            // Insert an identical element into the newly created component
            newActiveComponent.instantiateBytecode(elementBytecode);
            // Delete all elements that are going to be replaced by the new component
            _this.deleteElementImpl(hostTemplate, id);
          });
          // We must hard reload the new active component to ensure its own models have
          // been hydrated, or else element removals on subsequent conglomerations will
          // fail, i.e. template integrity will mismatch between processes and crash.
          return newActiveComponent.reload(
            {
              hardReload: true,
              clearCacheOptions: {
                doClearEntityCaches: true
              }
            },
            {},
            function() {
              // Need to ensure we make the requisite updates to disk
              newActiveComponent.handleUpdatedBytecode(newBytecode);
              var relpath = "./".concat(newActiveComponent.getRelpath());
              var identifier = ModuleWrapper.modulePathToIdentifierName(
                relpath
              );
              // In some cases, e.g. clicking the '+' sign, we don't want to instantiate
              // the component in the child which causes UX confusion
              if (options.skipInstantiateInHost) {
                return done();
              }
              // Finally we instantiate the created component on our own stage
              return _this.instantiateReference(
                newActiveComponent, // subcomponent
                identifier,
                relpath,
                coords, // "coords"/"maybeCoords"
                properties, // properties
                metadata,
                function(err) {
                  if (err) {
                    return done(err);
                  }
                  // Create a 'playback' keyframe on the parent to make the feature obvious
                  var insertion = _this.getReifiedBytecode().template
                    .children[0];
                  _this.upsertProperties(
                    _this.getReifiedBytecode(),
                    insertion.attributes[HAIKU_ID_ATTRIBUTE],
                    _this.getInstantiationTimelineName(),
                    0,
                    { playback: "loop" /* PlaybackFlag.LOOP */ },
                    "merge"
                  );
                  return done();
                }
              );
            }
          );
        });
      },
      function(err) {
        if (err) {
          return cb(err);
        }
        return cb(null, activeComponentToReturn);
      }
    );
  };
  ActiveComponent.prototype.instantiateBytecode = function(incomingBytecode) {
    var timelineName = this.getInstantiationTimelineName();
    var timelineTime = this.getInstantiationTimelineTime();
    var existingBytecode = this.getReifiedBytecode();
    var existingTemplate = existingBytecode.template;
    var hash = this.getInsertionPointInfo(0).hash;
    Bytecode.padIds(incomingBytecode, function(oldId) {
      return Template.getHash("".concat(oldId, "-").concat(hash), 12);
    });
    // Has to happen after the above line in case an id was generated
    var componentId = incomingBytecode.template.attributes[HAIKU_ID_ATTRIBUTE];
    logger.info(
      "[active component ("
        .concat(this.project.getAlias(), ")] instantiatee (bytecode) ")
        .concat(componentId, " via ")
        .concat(hash)
    );
    existingTemplate.children.unshift(incomingBytecode.template);
    this.mutateInstantiateeDisplaySettings(
      componentId,
      incomingBytecode.timelines,
      timelineName,
      timelineTime,
      incomingBytecode.template,
      null
    );
    Bytecode.mergeBytecodeControlStructures(existingBytecode, incomingBytecode);
  };
  /**
   * @method instantiateComponent
   * @description Given a relative path to an instantiable asset (which could be
   * an SVG or a component module, instantiate that component at the given position.
   * @param relpath {String} Relpath to an instantiable asset
   * @param coords {Object} Optional translation coords of the instantiatee
   * @param metadata {Object} Signal metadata
   * @param cb {Function}
   */
  ActiveComponent.prototype.instantiateComponent = function(
    relpath,
    coords,
    metadata,
    cb
  ) {
    var _this = this;
    return Lock.request(Lock.LOCKS.ActiveComponentWork, false, function(
      release
    ) {
      return _this.project.updateHook(
        "instantiateComponent",
        _this.getRelpath(),
        relpath,
        coords,
        metadata,
        function(fire) {
          // Since there are a few pathways to account for, the callback is defined up here
          var finish = function(err, manaForWrapperElement) {
            if (err) {
              release();
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: true,
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                release();
                fire(null, manaForWrapperElement);
                cb(null, manaForWrapperElement);
                // Immediately select the element after it is placed on stage
                return _this.selectElement(
                  manaForWrapperElement.attributes[HAIKU_ID_ATTRIBUTE],
                  metadata,
                  function() {}
                );
              }
            );
          };
          return _this.performComponentWork(function(bytecode, mana, done) {
            // We'll treat an installed module path strictly as a reference and not copy it into our folder
            if (ModuleWrapper.doesRelpathLookLikeInstalledComponent(relpath)) {
              var installedComponent = InstalledComponent.upsert({
                modpath: relpath
              });
              return _this.instantiateReference(
                installedComponent,
                installedComponent.getIdentifier(),
                relpath,
                coords,
                { "origin.x": 0.5, "origin.y": 0.5 },
                metadata,
                done
              );
            }
            // For local modules, the only caveat is that the component must be known in memory already
            if (ModuleWrapper.doesRelpathLookLikeLocalComponent(relpath)) {
              return _this.project.findActiveComponentBySource(
                relpath,
                function(err, subcomponent) {
                  if (!err && subcomponent) {
                    // We can't go further unless we actually have the reified bytecode
                    return subcomponent.moduleReload("basicReload", function() {
                      // This identifier is going to be something like foo_svg_blah
                      var localComponentIdentifier = ModuleWrapper.modulePathToIdentifierName(
                        relpath
                      );
                      return _this.instantiateReference(
                        subcomponent,
                        localComponentIdentifier,
                        relpath,
                        coords,
                        { "origin.x": 0.5, "origin.y": 0.5 },
                        metadata,
                        done
                      );
                    });
                  }
                  return done(
                    new Error("Cannot find component ".concat(relpath))
                  );
                }
              );
            }
            if (ModuleWrapper.doesRelpathLookLikeSVGDesign(relpath)) {
              return File.readMana(_this.project.getFolder(), relpath, function(
                err,
                mana
              ) {
                if (err) {
                  return done(err);
                }
                Template.fixManaSourceAttribute(mana, relpath); // Adds haiku-source="relpath_to_file_from_project_root"
                return _this.instantiateMana(
                  mana,
                  bytecode,
                  coords,
                  metadata,
                  done
                );
              });
            }
            if (Asset.isImage(relpath)) {
              var imageComponent_1 = ImageComponent.upsert({
                project: _this.project,
                relpath: relpath
              });
              return imageComponent_1.queryImageSize(function(err, size) {
                if (err) {
                  return done(err);
                }
                var width = size.width,
                  height = size.height;
                return _this.instantiateReference(
                  imageComponent_1, // subcomponent
                  imageComponent_1.identifier, // identifier
                  imageComponent_1.modpath, // modpath
                  coords, // coords
                  {
                    "origin.x": 0.5,
                    "origin.y": 0.5,
                    href: imageComponent_1.getLocalHref(),
                    width: width,
                    height: height
                  },
                  metadata,
                  done
                );
              });
            }
            return done(new Error("Problem instantiating ".concat(relpath)));
          }, finish);
        }
      );
    });
  };
  ActiveComponent.prototype.deleteComponents = function(
    componentIds,
    metadata,
    cb
  ) {
    var _this = this;
    return Lock.request(Lock.LOCKS.ActiveComponentWork, false, function(
      release
    ) {
      _this.project.updateHook(
        "deleteComponents",
        _this.getRelpath(),
        componentIds,
        metadata,
        function(fire) {
          return _this.performComponentWork(
            function(bytecode, mana, done) {
              componentIds.forEach(function(componentId) {
                var element = _this.findElementByComponentId(componentId);
                if (element) {
                  element.remove();
                }
                _this.deleteElementImpl(mana, componentId);
              });
              done();
            },
            function(err) {
              if (err) {
                release();
                logger.error(
                  "[active component (".concat(_this.project.getAlias(), ")]"),
                  err
                );
                return cb(err);
              }
              return _this.reload(
                {
                  hardReload: true,
                  clearCacheOptions: {
                    doClearEntityCaches: true
                  }
                },
                null,
                function() {
                  release();
                  fire();
                  return cb();
                }
              );
            }
          );
        }
      );
    });
  };
  ActiveComponent.prototype.deleteElementImpl = function(mana, componentId) {
    Template.visitManaTree(mana, function(
      elementName,
      attributes,
      children,
      node,
      locator,
      parent,
      index
    ) {
      if (!attributes) {
        return null;
      }
      if (!attributes[HAIKU_ID_ATTRIBUTE]) {
        return null;
      }
      if (componentId !== attributes[HAIKU_ID_ATTRIBUTE]) {
        return null;
      }
      if (parent) {
        // Where the magic happens ^_^
        parent.children.splice(index, 1);
      } else {
        // No parent means we are at the top
        mana.elementName = "div";
        mana.attributes = {};
        mana.children = [];
      }
    });
  };
  ActiveComponent.prototype.mergePrimitiveWithOverrides = function(
    primitive,
    overrides,
    cb
  ) {
    var _this = this;
    return this.performComponentWork(function(bytecode, template, done) {
      Template.visit(template, function(node) {
        // Only merge into nodes that match our haiku-source design path
        if (
          node.attributes[HAIKU_SOURCE_ATTRIBUTE] !== primitive.getRequirePath()
        ) {
          return;
        }
        var timelineName = _this.getMergeDesignTimelineName();
        var timelineTime = _this.getMergeDesignTimelineTime();
        var haikuId = node.attributes[HAIKU_ID_ATTRIBUTE];
        var timelineObj =
          bytecode.timelines &&
          bytecode.timelines[timelineName] &&
          bytecode.timelines[timelineName]["haiku:".concat(haikuId)];
        if (timelineObj) {
          for (var propertyName in timelineObj) {
            var keyframeObj = timelineObj[propertyName][timelineTime];
            // Nothing to do if no keyframe spec at this time
            if (!keyframeObj) {
              continue;
            }
            // Nothing to do if the keyframe object was edited
            if (keyframeObj.edited) {
              continue;
            }
            var overrideVal = overrides[propertyName];
            if (overrideVal !== undefined) {
              keyframeObj.value = overrideVal;
            }
          }
        }
      });
      done();
    }, cb);
  };
  ActiveComponent.prototype.removeChildContentFromBytecode = function(
    bytecode,
    mana
  ) {
    // Return the data that we removed in case we want to retain anything when designs merge
    var removedOutputs = {};
    Template.visit(mana, function(node, parent, index, depth, address) {
      // Skip the topmost node; that wrapper stays
      if (node === mana) {
        return;
      }
      var haikuId = node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE];
      if (!haikuId) {
        return;
      }
      removedOutputs[haikuId] = {
        treeInfo: { index: index, depth: depth, address: address },
        templateNode: node,
        eventHandlers: {},
        timelines: {}
      };
      var haikuSelector = "haiku:".concat(haikuId);
      if (bytecode.eventHandlers) {
        // In case we want to re-set any removed event handlers to new content
        removedOutputs[haikuId].eventHandlers =
          bytecode.eventHandlers[haikuSelector];
        delete bytecode.eventHandlers[haikuSelector];
      }
      if (bytecode.timelines) {
        for (var timelineName in bytecode.timelines) {
          // In case we want to re-set any removed timelines to new content
          removedOutputs[haikuId].timelines[timelineName] =
            bytecode.timelines[timelineName][haikuSelector];
          delete bytecode.timelines[timelineName][haikuSelector];
        }
      }
    });
    // Remove our own children, whose content we just purged
    mana.children.splice(0);
    return removedOutputs;
  };
  ActiveComponent.prototype.findEquivalentNode = function(node, _a, template) {
    var index = _a.index,
      depth = _a.depth,
      address = _a.address;
    var foundNode;
    var ourDomId = node.attributes && node.attributes.id;
    Template.visit(template, function(
      desc,
      parent,
      theirIndex,
      theirDepth,
      theirAddress
    ) {
      // Stop if we've already found a match
      if (foundNode) {
        return;
      }
      var theirDomId = desc.attributes && desc.attributes.id;
      // We have a match if the node at the same address matches ours
      if (
        address === theirAddress &&
        node.elementName === desc.elementName &&
        ourDomId === theirDomId
      ) {
        foundNode = desc;
      }
    });
    return foundNode;
  };
  ActiveComponent.prototype.mergeRemovedOutputs = function(
    bytecode,
    subtemplate,
    removals
  ) {
    // Nothing to do if there aren't any timelines to merge into
    if (!bytecode.timelines) {
      return;
    }
    for (var haikuId in removals) {
      var _a = removals[haikuId],
        treeInfo = _a.treeInfo,
        templateNode = _a.templateNode,
        timelines = _a.timelines;
      var equivalent = this.findEquivalentNode(
        templateNode,
        treeInfo,
        subtemplate
      );
      if (!equivalent) {
        continue;
      }
      var equivalentId =
        equivalent.attributes && equivalent.attributes[HAIKU_ID_ATTRIBUTE];
      if (!equivalentId) {
        continue;
      }
      // Allows for copying of replaced Element data into their replacements
      equivalent.__replacee = templateNode;
      var equivalentSelector = "haiku:".concat(equivalentId);
      for (var timelineName in bytecode.timelines) {
        // Nothing to do if our removal doesn't have the matching timeline
        if (!timelines[timelineName]) {
          continue;
        }
        // And nothing to do if our timeline doesn't have a matching output set
        if (!bytecode.timelines[timelineName][equivalentSelector]) {
          continue;
        }
        for (var propertyName in timelines[timelineName]) {
          for (var keyframeMs in timelines[timelineName][propertyName]) {
            var sourceObj = timelines[timelineName][propertyName][keyframeMs];
            // Don't merge unless our source object has been explicitly edited
            if (!sourceObj.edited) {
              continue;
            }
            // Create the keyframes set if it doesn't exist
            if (
              !bytecode.timelines[timelineName][equivalentSelector][
                propertyName
              ]
            ) {
              bytecode.timelines[timelineName][equivalentSelector][
                propertyName
              ] = {};
            }
            // Create the values object if it doesn't exist
            if (
              !bytecode.timelines[timelineName][equivalentSelector][
                propertyName
              ][keyframeMs]
            ) {
              bytecode.timelines[timelineName][equivalentSelector][
                propertyName
              ][keyframeMs] = {};
            }
            var targetObj =
              bytecode.timelines[timelineName][equivalentSelector][
                propertyName
              ][keyframeMs];
            // Attach any values from source (old) onto the target (new)
            if (sourceObj.curve) {
              targetObj.curve = sourceObj.curve;
            }
            if (sourceObj.value !== undefined) {
              targetObj.value = sourceObj.value;
            }
            // Don't forget to mark the target (new) as edited so subsequent merges work
            targetObj.edited = true;
          }
        }
      }
    }
  };
  ActiveComponent.prototype.mergeMana = function(
    existingBytecode,
    manaIncoming,
    index,
    _a
  ) {
    var _this = this;
    var _b = _a.mergeRemovedOutputs,
      mergeRemovedOutputs = _b === void 0 ? true : _b;
    var numMatchingNodes = 0;
    var timelineName = this.getMergeDesignTimelineName();
    var timelineTime = this.getMergeDesignTimelineTime();
    Template.visitWithoutDescendingIntoSubcomponents(
      existingBytecode.template,
      function(existingNode) {
        // Only merge into any that match our source design path
        if (
          !existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE] ||
          !manaIncoming.attributes[HAIKU_SOURCE_ATTRIBUTE] ||
          Template.normalizePath(
            existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE]
          ) !==
            Template.normalizePath(
              manaIncoming.attributes[HAIKU_SOURCE_ATTRIBUTE]
            )
        ) {
          return;
        }
        var safeIncoming = Template.clone({}, manaIncoming);
        var removedOutputs = _this.removeChildContentFromBytecode(
          existingBytecode,
          existingNode
        );
        var hash = _this.getInsertionPointInfo(
          "".concat(index, "-").concat(numMatchingNodes++)
        ).hash;
        var timelinesObject = Template.prepareManaAndBuildTimelinesObject(
          safeIncoming,
          hash,
          timelineName,
          timelineTime,
          {
            doHashWork: true
          }
        );
        var existingSelector = "haiku:".concat(
          existingNode.attributes[HAIKU_ID_ATTRIBUTE]
        );
        var incomingSelector = "haiku:".concat(
          safeIncoming.attributes[HAIKU_ID_ATTRIBUTE]
        );
        // Ensure properties destined for the root node are applied to the correct id
        timelinesObject[timelineName][existingSelector] =
          timelinesObject[timelineName][incomingSelector];
        delete timelinesObject[timelineName][incomingSelector];
        for (var i = 0; i < safeIncoming.children.length; i++) {
          var incomingChild = safeIncoming.children[i];
          existingNode.children.push(incomingChild);
        }
        Bytecode.mergeTimelines(existingBytecode.timelines, timelinesObject);
        if (mergeRemovedOutputs) {
          _this.mergeRemovedOutputs(
            existingBytecode,
            existingNode,
            removedOutputs
          );
        }
      }
    );
  };
  ActiveComponent.prototype.mergeDesignFiles = function(designs, cb) {
    var _this = this;
    return this.performComponentWork(function(bytecode, template, done) {
      return _this.mergeDesignFilesImpl(designs, bytecode, {}, done);
    }, cb);
  };
  ActiveComponent.prototype.mergeDesignFilesImpl = function(
    designs,
    bytecode,
    _a,
    cb
  ) {
    var _this = this;
    var _b = _a.mergeRemovedOutputs,
      mergeRemovedOutputs = _b === void 0 ? true : _b;
    // Ensure order is the same across processes otherwise we'll end up with different insertion point hashes
    var designsAsArray = Object.keys(designs).sort(function(a, b) {
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });
    if (!designsAsArray.length) {
      return cb();
    }
    // Check which sources are actually being used in instantiated components.
    var usedSources = new Set();
    Template.visitWithoutDescendingIntoSubcomponents(
      bytecode.template,
      function(existingNode) {
        // Only merge into any that match our source design path
        if (existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE]) {
          usedSources.add(existingNode.attributes[HAIKU_SOURCE_ATTRIBUTE]);
        }
      }
    );
    // Each series is important so we don't inadvertently create a race and thus unstable insertion point hashes
    return async.eachOfSeries(
      designsAsArray,
      function(relpath, index, next) {
        if (
          ModuleWrapper.doesRelpathLookLikeSVGDesign(relpath) &&
          usedSources.has(path.posix.normalize(relpath))
        ) {
          return File.readMana(_this.project.getFolder(), relpath, function(
            err,
            mana
          ) {
            // There may be a race where a file is removed before this gets called;
            // and in that case we need to skip this whole subroutine (simply don't
            // touch whatever designs may have been instantiated).
            if (err || !mana) {
              return next();
            }
            Template.fixManaSourceAttribute(mana, relpath); // Adds haiku-source="relpath_to_file_from_project_root"
            _this.mergeMana(bytecode, mana, index, {
              mergeRemovedOutputs: mergeRemovedOutputs
            });
            return next();
          });
        }
        return next();
      },
      function(err, out) {
        if (err) {
          return cb(err);
        }
        var bytecode = _this.getReifiedBytecode();
        // Make sure all components that host a copy of us now have updated bytecode for us
        _this.project.getAllActiveComponents().forEach(function(ac) {
          if (!ac.$instance) {
            return;
          }
          ac.$instance.visitGuestHierarchy(function(instance) {
            if (_this.doesManageCoreInstance(instance)) {
              var safe = ActiveComponent.memorySafeBytecode(bytecode, instance);
              if (instance.node.__memory && instance.node.__memory.parent) {
                Object.assign(instance.node.__memory.parent.elementName, safe);
              }
              Object.assign(instance.bytecode, safe);
            }
          });
        });
        return cb(null, out);
      }
    );
  };
  /**
   * @method pasteThings
   * @description Flexibly paste some content into the component. Usually the thing pasted is going to be a
   * component, but this could theoretically handle any kind of 'pasteable' content.
   * @param pasteablesSerial {Array.<{}>} - Content of the thing to paste into the component.
   * @param options {{skipHashPadding: boolean}} - Optional object containing information about _how_ to paste
   * @param metadata {Object}
   * @param cb {Function}
   */
  ActiveComponent.prototype.pasteThings = function(
    pasteablesSerial,
    options,
    metadata,
    cb
  ) {
    var _this = this;
    var pasteables = pasteablesSerial.map(function(pasteableSerial) {
      return Bytecode.unserializeValue(pasteableSerial, function(ref) {
        return _this.evaluateReference(ref);
      });
    });
    return Lock.request(Lock.LOCKS.ActiveComponentWork, false, function(
      release
    ) {
      return _this.project.updateHook(
        "pasteThings",
        _this.getRelpath(),
        pasteablesSerial,
        options,
        metadata,
        function(fire) {
          return _this.performComponentWork(
            function(bytecode, mana, done) {
              var haikuIds = [];
              return async.eachSeries(
                pasteables,
                function(pasteable, next) {
                  if (pasteable.kind === "bytecode") {
                    // Handle specially if the pasted thing is a component
                    var nested_1 =
                      pasteable.data &&
                      pasteable.data.template &&
                      pasteable.data.template.elementName;
                    if (typeof nested_1 === "object") {
                      var source =
                        pasteable.data.template.attributes[
                          HAIKU_SOURCE_ATTRIBUTE
                        ];
                      var identifier =
                        pasteable.data.template.attributes[HAIKU_VAR_ATTRIBUTE];
                      var scenename = _this.project.relpathToSceneName(source);
                      nested_1.__reference = ModuleWrapper.buildReference(
                        ModuleWrapper.REF_TYPES.COMPONENT, // type
                        Template.normalizePath("./".concat(_this.getRelpath())), // host
                        Template.normalizePathOfPossiblyExternalModule(source),
                        identifier
                      );
                      return _this.project.findOrCreateActiveComponent(
                        scenename,
                        function(err, ac) {
                          if (err) {
                            return next(err);
                          }
                          // We can't go further unless we actually have the reified bytecode
                          return ac.moduleReload("basicReload", function() {
                            ac.doesMatchOrHostComponent(_this, function(
                              _,
                              answer
                            ) {
                              // First check (and silently skip) if we are a host of this bytecode. This error state
                              // can be created by e.g. pasting a component instance from its host into itself.
                              if (!answer) {
                                // In order to render correctly, the template.elementName needs to have the full
                                // bytecode object; note that core should automatically instantiate a HaikuComponent
                                lodash.assign(
                                  nested_1,
                                  ac.getReifiedBytecode()
                                );
                                haikuIds.push(
                                  _this.pasteBytecodeImpl(
                                    bytecode,
                                    pasteable.data,
                                    options
                                  )
                                );
                              }
                              return next();
                            });
                          });
                        }
                      );
                    }
                    haikuIds.push(
                      _this.pasteBytecodeImpl(bytecode, pasteable.data, options)
                    );
                    return next();
                  }
                  logger.warn(
                    "[active component ("
                      .concat(_this.project.getAlias(), ")] cannot paste ")
                      .concat(pasteable.kind)
                  );
                  return next();
                },
                function(err) {
                  return done(err, { haikuIds: haikuIds });
                }
              );
            },
            function(err, _a) {
              var haikuIds = _a.haikuIds;
              if (err) {
                release();
                logger.error(
                  "[active component (".concat(_this.project.getAlias(), ")]"),
                  err
                );
                return cb(err);
              }
              return _this.reload(
                {
                  hardReload: true,
                  clearCacheOptions: {
                    doClearEntityCaches: true
                  }
                },
                null,
                function() {
                  release();
                  fire(null, { haikuIds: haikuIds });
                  return cb(null, { haikuIds: haikuIds });
                }
              );
            }
          );
        }
      );
    });
  };
  ActiveComponent.prototype.pasteBytecodeImpl = function(
    ourBytecode,
    theirBytecode,
    _a
  ) {
    var _b = _a.skipHashPadding,
      skipHashPadding = _b === void 0 ? false : _b;
    theirBytecode = Bytecode.clone(theirBytecode);
    if (!skipHashPadding) {
      // As usual, we use a hash rather than randomness because of multithreading
      var hash_1 = this.getInsertionPointInfo(0).hash;
      // Pasting bytecode is implemented as a bytecode merge, so we pad all of the
      // ids inside the bytecode and then merge it, so we end up with a new element
      // and new timeline properties defined for it. This mutates the object.
      Bytecode.padIds(theirBytecode, function(oldId) {
        return "".concat(oldId, "-").concat(hash_1);
      });
    }
    var haikuId = theirBytecode.template.attributes["haiku-id"];
    // Paste handles "instantiating" a new template element for their bytecode
    Bytecode.pasteBytecode(ourBytecode, theirBytecode);
    logger.info(
      "[active component ("
        .concat(this.project.getAlias(), ")] pastee (bytecode) ")
        .concat(haikuId)
    );
    // When pasting, move the object to the front
    this.zMoveToFrontImpl(ourBytecode, haikuId, "Default", 0);
    return haikuId;
  };
  ActiveComponent.prototype.evaluateReference = function(__reference) {
    var modref = ModuleWrapper.parseReference(__reference);
    if (
      modref &&
      modref.type &&
      modref.type === ModuleWrapper.REF_TYPES.COMPONENT
    ) {
      var ac = this.project.findActiveComponentBySourceIfPresent(modref.source);
      if (ac) {
        var bytecode = ac.getReifiedBytecode();
        return lodash.assign({ __reference: __reference }, bytecode);
      }
    }
    return __reference;
  };
  ActiveComponent.prototype.splitSelectedKeyframes = function(metadata) {
    var keyframes = this.getSelectedKeyframes();
    keyframes.forEach(function(keyframe) {
      return keyframe.removeCurve(metadata);
    });
  };
  ActiveComponent.prototype.deleteSelectedKeyframes = function(metadata) {
    var keyframes = this.getSelectedKeyframes();
    if (Keyframe.groupIsSingleTween(keyframes)) {
      return keyframes[0].removeCurve(metadata);
    }
    keyframes.forEach(function(keyframe) {
      if (!keyframe.isTransitionSegment()) {
        var prev = keyframe.prev();
        if (prev && prev.isTransitionSegment()) {
          prev.removeCurve(metadata);
        }
      }
      keyframe.delete(metadata);
    });
  };
  ActiveComponent.prototype.joinSelectedKeyframes = function(
    curveName,
    metadata
  ) {
    var keyframes = this.getSelectedKeyframes();
    keyframes.forEach(function(keyframe) {
      // Only keyframes that have a next keyframe should get the curve assigned,
      // otherwise you'll see a "surprise curve" if you add a next keyframe
      // But only assign if its body is selected or it is directly selected
      if (keyframe.next() && keyframe.isSelectedBody()) {
        keyframe.addCurve(curveName, metadata);
      }
    });
  };
  ActiveComponent.prototype.changeCurveOnSelectedKeyframes = function(
    curveName,
    metadata
  ) {
    var keyframes = this.getSelectedKeyframes();
    keyframes.forEach(function(keyframe) {
      // Only keyframes that have a next keyframe should get the curve assigned,
      // otherwise you'll see a "surprise curve" if you add a next keyframe.
      // But only assign if its body is selected or it is directly selected
      if (keyframe.next() && keyframe.isSelectedBody()) {
        keyframe.changeCurve(curveName, metadata);
      }
    });
  };
  ActiveComponent.prototype.getFirstSelectedCurve = function() {
    var keyframes = this.getSelectedKeyframes();
    var selectedKeyframeWithCurve = keyframes.find(function(keyframe) {
      return keyframe.isSelectedBody();
    });
    return selectedKeyframeWithCurve
      ? selectedKeyframeWithCurve.getCurve()
      : null;
  };
  ActiveComponent.prototype.dragStartSelectedKeyframes = function(
    dragData,
    referenceKeyframe
  ) {
    var keyframes = this.getSelectedKeyframes();
    if (referenceKeyframe && Keyframe.groupIsSingleTween(keyframes)) {
      referenceKeyframe.dragStart(dragData);
    } else {
      keyframes.forEach(function(keyframe) {
        return keyframe.dragStart(dragData);
      });
    }
  };
  ActiveComponent.prototype.dragStopSelectedKeyframes = function() {
    var keyframes = this.getSelectedKeyframes();
    keyframes.forEach(function(keyframe) {
      return keyframe.dragStop();
    });
    // We only update once we're finished dragging because moving keyframes may end up
    // destroying/creating keyframes in the bytecode, and when rehydrate() is called, the
    // ids (which are based on keyframe indices) would end up offset
    this.commitAccumulatedKeyframeMovesDebounced();
  };
  ActiveComponent.prototype.dragSelectedKeyframes = function(
    pxpf,
    mspf,
    dragData,
    metadata,
    referenceKeyframe
  ) {
    var keyframes = this.getSelectedKeyframes();
    if (referenceKeyframe && Keyframe.groupIsSingleTween(keyframes)) {
      referenceKeyframe.drag(pxpf, mspf, dragData, metadata);
    } else {
      keyframes.forEach(function(keyframe) {
        return keyframe.drag(pxpf, mspf, dragData, metadata);
      });
    }
  };
  // Returns true iff the element has any transitions or expressions.
  ActiveComponent.prototype.elementHasTransitionOrExpression = function(
    elementId
  ) {
    var bytecode = this.getReifiedBytecode();
    var timelineName = this.getCurrentTimelineName();
    var componentId = "haiku:".concat(elementId);
    if (componentId in bytecode.timelines[timelineName]) {
      var componentTimeline = bytecode.timelines[timelineName][componentId];
      var _loop_1 = function(propertyName) {
        // Skip non LAYOUT_3D_SCHEMA properties. Other properties aren't lost on group
        if (!LAYOUT_3D_SCHEMA[propertyName]) {
          return "continue";
        }
        var propertyTimeline = componentTimeline[propertyName];
        // Check if property has more than one keyframe of non-equivalent values.
        if (propertyTimeline instanceof Object) {
          var keys = Object.keys(propertyTimeline);
          var values_1 = keys.map(function(key) {
            return propertyTimeline[key].value;
          });
          if (keys.length > 1) {
            if (
              values_1.some(function(value) {
                return value !== values_1[0];
              })
            ) {
              return { value: true };
            }
          }
          if (
            values_1.some(function(value) {
              return value instanceof Function;
            })
          ) {
            return { value: true };
          }
        }
      };
      for (var propertyName in componentTimeline) {
        var state_1 = _loop_1(propertyName);
        if (typeof state_1 === "object") return state_1.value;
      }
    }
    return false;
  };
  ActiveComponent.prototype.snapshotKeyframeUpdates = function(
    keyframeUpdates
  ) {
    var bytecode = this.getReifiedBytecode();
    var updates = {};
    for (var timelineName in keyframeUpdates) {
      updates[timelineName] = {};
      for (var componentId in keyframeUpdates[timelineName]) {
        var selector = Template.buildHaikuIdSelector(componentId);
        updates[timelineName][componentId] = {};
        for (var propertyName in keyframeUpdates[timelineName][componentId]) {
          updates[timelineName][componentId][propertyName] = {};
          for (var keyframeMs in keyframeUpdates[timelineName][componentId][
            propertyName
          ]) {
            if (
              !bytecode.timelines[timelineName] ||
              !bytecode.timelines[timelineName][selector] ||
              !bytecode.timelines[timelineName][selector][propertyName] ||
              !bytecode.timelines[timelineName][selector][propertyName][
                keyframeMs
              ]
            ) {
              if (Number(keyframeMs) === 0) {
                var elementName = this.getElementNameOfComponentId(componentId);
                updates[timelineName][componentId][propertyName][keyframeMs] = {
                  value: TimelineProperty.getFallbackValue(
                    elementName,
                    propertyName
                  )
                };
              } else {
                // Special marker for inverter: before, there was no keyframe here.
                updates[timelineName][componentId][propertyName][
                  keyframeMs
                ] = null;
              }
              continue;
            }
            var keyfVal =
              typeof bytecode.timelines[timelineName][selector][propertyName][
                keyframeMs
              ].value === "function"
                ? bytecode.timelines[timelineName][selector][propertyName][
                    keyframeMs
                  ].value
                : lodash.clone(
                    bytecode.timelines[timelineName][selector][propertyName][
                      keyframeMs
                    ].value
                  );
            updates[timelineName][componentId][propertyName][keyframeMs] = {
              value: keyfVal
            };
          }
        }
      }
    }
    return updates;
  };
  ActiveComponent.prototype.gatherZIndexKeyframeMoves = function(timelineName) {
    var _a;
    var keyframeMovesDescriptor = ((_a = {}), (_a[timelineName] = {}), _a);
    this.getReifiedTemplate().children.forEach(function(child) {
      keyframeMovesDescriptor[timelineName][
        child.attributes[HAIKU_ID_ATTRIBUTE]
      ] = {
        "style.zIndex": {}
      };
    });
    return this.snapshotKeyframeMoves(keyframeMovesDescriptor);
  };
  ActiveComponent.prototype.gatherKeyframeMoves = function(
    componentId,
    timelineName,
    propertyNames
  ) {
    var keyframeMovesDescriptor = {};
    keyframeMovesDescriptor[timelineName] = {};
    keyframeMovesDescriptor[timelineName][componentId] = {};
    propertyNames.forEach(function(propertyName) {
      keyframeMovesDescriptor[timelineName][componentId][propertyName] = {};
    });
    return this.snapshotKeyframeMoves(keyframeMovesDescriptor);
  };
  ActiveComponent.prototype.snapshotKeyframeMoves = function(
    keyframeMovesDescriptor
  ) {
    var moves = {};
    for (var timelineName in keyframeMovesDescriptor) {
      moves[timelineName] = {};
      for (var componentId in keyframeMovesDescriptor[timelineName]) {
        moves[timelineName][componentId] = {};
        var propertyNames = Object.keys(
          keyframeMovesDescriptor[timelineName][componentId]
        );
        var keyframesObj = this.getKeyframesObjectForPropertyNames(
          timelineName,
          componentId,
          propertyNames
        );
        for (var propertyName in keyframesObj) {
          var propertyObj = keyframesObj[propertyName];
          moves[timelineName][componentId][propertyName] = {};
          for (var keyframeMs in propertyObj) {
            var keyfObj = propertyObj[keyframeMs];
            var keyfVal =
              typeof keyfObj.value === "function"
                ? keyfObj.value
                : lodash.clone(keyfObj.value);
            moves[timelineName][componentId][propertyName][keyframeMs] = {
              value: keyfVal
            };
            if (keyfObj.curve) {
              moves[timelineName][componentId][propertyName][keyframeMs].curve =
                keyfObj.curve;
            }
            if (keyfObj.edited) {
              moves[timelineName][componentId][propertyName][
                keyframeMs
              ].edited = true;
            }
          }
        }
      }
    }
    return moves;
  };
  ActiveComponent.prototype.commitAccumulatedKeyframeMoves = function() {
    this.moveKeyframes(
      Keyframe.buildKeyframeMoves({ component: this }, true),
      this.project.getMetadata(),
      function() {}
    );
  };
  ActiveComponent.prototype.getMount = function() {
    return this.mount;
  };
  ActiveComponent.prototype.getArtboard = function() {
    return this.artboard;
  };
  ActiveComponent.prototype.getSelectionMarquee = function() {
    return this.marquee;
  };
  /** ------------ */
  /** ------------ */
  /** ------------ */
  ActiveComponent.prototype.reload = function(
    reloadOptions,
    instanceConfig,
    cb
  ) {
    var _this = this;
    var runReload = function(done) {
      if (reloadOptions.hardReload) {
        return _this.hardReload(reloadOptions, instanceConfig, done);
      }
      return _this.softReload(reloadOptions, instanceConfig, done);
    };
    if (reloadOptions.skipReloadLock) {
      return runReload(cb);
    }
    // Note that this lock only occurs in .reload(); if you ever hard reload or
    // soft reload a la carte, you might get a race condition!
    return Lock.request(Lock.LOCKS.ActiveComponentReload, false, function(
      release
    ) {
      var finish = function(err) {
        release();
        if (err) {
          return cb(err);
        }
        // Note: The hard/soft signal may affect how the views decide to refresh
        _this.emit(
          "update",
          "reloaded",
          reloadOptions.hardReload ? "hard" : "soft"
        );
        return cb();
      };
      return runReload(finish);
    });
  };
  ActiveComponent.prototype.softReload = function(
    reloadOptions,
    instanceConfig,
    cb
  ) {
    // Some methods, like setInteractionMode, don't actually require a cache clear
    if (!reloadOptions.superficial) {
      this.clearCaches(reloadOptions.clearCacheOptions);
    }
    // Check sustained warnings should be done after cache clear
    // We use emit so only creator will perform sustained warning check
    if (experimentIsEnabled(Experiment.WarnOnUndefinedStateVariables)) {
      this.emitDebouncedCheckSustainedWarning();
    }
    // If we were passed a "hot component" or asked to request a full flush render, forward this to our underlying
    // instances to ensure correct rendering. This can be skipped if softReload() was called in the
    // context of a hard reload, because hardReload() calls forceFlush() after soft reloading.
    if (!reloadOptions.hardReload) {
      if (reloadOptions.forceFlush) {
        this.forceFlush();
      } else if (reloadOptions.hotComponents) {
        this.addHotComponents(reloadOptions.hotComponents);
      }
    }
    return cb();
  };
  ActiveComponent.prototype.hardReload = function(
    reloadOptions,
    instanceConfig,
    finish
  ) {
    var _this = this;
    var timelineTimeBeforeReload = this.getCurrentTimelineTime() || 0;
    return async.series(
      [
        function(cb) {
          // Stop the clock so we don't continue any animations while this update is happening
          if (_this.$instance) {
            _this.$instance.context.clock.stop();
          }
          return cb();
        },
        function(cb) {
          if (!reloadOptions.moduleReloadMethod) {
            return cb();
          }
          return _this.moduleCreate(
            reloadOptions.moduleReloadMethod,
            instanceConfig,
            cb
          );
        },
        function(cb) {
          // softReload calls clearCaches, which clears the caches of our component instance
          return _this.softReload(reloadOptions, instanceConfig, cb);
        },
        function(cb) {
          if (typeof reloadOptions.customRehydrate === "function") {
            // In many cases a full rehydration isn't desired because we know exactly
            // what models need to be updated in order to proceed; if the user
            // specifies this then we call their own custom rehydration function
            reloadOptions.customRehydrate(reloadOptions);
          } else {
            // Rehydrate all the view-models so our view renders correctly
            // This has to happen __after softReload__ because soft reload calls
            // flush, and all the models need access to the rendered app in
            // order to compute various things properly (race condition)
            _this.rehydrate(reloadOptions);
          }
          // Fix caches from our on-stage controls.
          ElementSelectionProxy.clearCaches();
          // If we don't do this here, continued edits at this time won't work properly.
          // We have to do this  __after rehydrate__ so we update all copies fo the models we've
          // just loaded into memory who have reset attributes.
          _this.forceFlush();
          _this.setTimelineTimeValue(timelineTimeBeforeReload, true);
          // Start the clock again, as we should now be ready to flow updated component.
          if (_this.$instance) {
            _this.$instance.context.clock.start();
            // If the scrubber had been dragged past the max defined keyframe, the timeline instances
            // will start off in a not-playing state, the effect of which will be that scrubbing the
            // timeline will not animate the child; this sets the value to playing so that scrubbing works
            var timeline = _this.$instance.getTimeline(
              _this.getCurrentTimelineName()
            );
            if (timeline) {
              timeline.setPlaying(true);
            }
          }
          // Solely used to allow glass to update internally when the authoritative frame changes
          _this.project.emit(
            "change-authoritative-frame",
            Math.round(timelineTimeBeforeReload / _this.getCurrentMspf())
          );
          return cb();
        }
      ],
      finish
    );
  };
  ActiveComponent.prototype.destroy = function(cleanup) {
    if (cleanup === void 0) {
      cleanup = false;
    }
    // If an instance has been created, knock it out.
    if (this.$instance) {
      this.$instance.context.contextUnmount();
      this.$instance.context.getClock().stop();
      this.$instance.context.destroy();
    }
    this.file.destroy(cleanup);
    // Clean out any remaining model instances.
    for (
      var _i = 0,
        _a = [
          MountElement,
          Artboard,
          SelectionMarquee,
          Timeline,
          Keyframe,
          Row,
          Element,
          ElementSelectionProxy
        ];
      _i < _a.length;
      _i++
    ) {
      var klass = _a[_i];
      klass.where({ component: this }).forEach(function(instance) {
        return instance.destroy();
      });
    }
    _super.prototype.destroy.call(this);
  };
  ActiveComponent.prototype.moduleReload = function(moduleReloadMethod, cb) {
    if (moduleReloadMethod === void 0) {
      moduleReloadMethod = "basicReload";
    }
    return this.fetchActiveBytecodeFile().mod[moduleReloadMethod](cb);
  };
  ActiveComponent.prototype.doesManageCoreInstance = function(instance) {
    // In case an installed or builtin component doesn't declare its relpath
    if (!instance.getBytecodeRelpath()) {
      return false;
    }
    return (
      path.normalize(instance.getBytecodeRelpath()) ===
      path.normalize(this.getRelpath())
    );
  };
  ActiveComponent.prototype.moduleCreate = function(
    moduleReloadMethod,
    instanceConfig,
    cb
  ) {
    var _this = this;
    if (instanceConfig === void 0) {
      instanceConfig = {};
    }
    return this.moduleReload(moduleReloadMethod, function(err) {
      if (err) {
        return cb(err);
      }
      var bytecode = _this.getReifiedBytecode();
      // Don't clean up instances which may own the current editing context.
      // WARNING: be VERY careful changing anything here—your sanity depends on it.
      if (_this.isProjectActiveComponent()) {
        _this.project.getAllActiveComponents().forEach(function(ac) {
          // We also deactivate our own instance since we're about to create a new one
          if (ac.$instance) {
            ac.$instance.visitGuestHierarchy(function(instance) {
              instance.deactivate();
              if (_this.doesManageCoreInstance(instance)) {
                var safe = ActiveComponent.memorySafeBytecode(
                  bytecode,
                  instance
                );
                if (instance.node.__memory && instance.node.__memory.parent) {
                  Object.assign(
                    instance.node.__memory.parent.elementName,
                    safe
                  );
                }
                Object.assign(instance.bytecode, safe);
              }
              instance.clearCaches({
                clearStates: true
              });
            });
            ac.$instance.context.contextUnmount();
            ac.$instance.context.getClock().stop();
          }
        });
      }
      if (_this.$instance) {
        _this.$instance.context.destroy();
      }
      var timelineTime = _this.getCurrentTimelineTime();
      _this.$instance = _this.createInstance(bytecode, instanceConfig);
      // Sustained warnings checker (eg. injected function identifier not found, etc)
      _this.sustainedWarningsChecker = new SustainedWarningChecker(
        _this.$instance
      );
      // Use debounce to emit event to trigger sustained warnings check on haiku-creator
      _this.emitDebouncedCheckSustainedWarning = lodash.debounce(
        function() {
          _this.emit("sustained-check:start");
        },
        CHECK_SUSTAINED_WARNINGS_DEBOUNCE_TIME,
        { leading: false, trailing: true }
      );
      _this.setTimelineTimeValue(timelineTime, true);
      return cb();
    });
  };
  ActiveComponent.prototype.moduleFindOrCreate = function(
    moduleReloadMethod,
    instanceConfig,
    cb
  ) {
    if (this.$instance) {
      return cb();
    }
    return this.moduleCreate(moduleReloadMethod, instanceConfig, cb);
  };
  ActiveComponent.prototype.isProjectActiveComponent = function() {
    return this.project.getCurrentActiveComponent() === this;
  };
  ActiveComponent.prototype.createInstance = function(bytecode, config) {
    var factory = HaikuDOMAdapter(bytecode, null, null);
    var createdHaikuCoreComponent = factory(
      this.getMount().$el(),
      lodash.merge(
        {},
        {
          folder: ensureTrailingSlash(this.project.getFolder()),
          contextMenu: "disabled", // Don't show the right-click context menu since our editing tools use right-click
          overflowX: "visible",
          overflowY: "visible",
          mixpanel: false, // Don't track events in mixpanel while the component is being built
          interactionMode: this.interactionMode,
          hotEditingMode: true, // Don't clone the bytecode/template so we can mutate it in-place
          clock: {
            run: false
          }
        },
        config
      )
    );
    createdHaikuCoreComponent.context.getContainer(true); // Force recalc of container for correct sizing
    createdHaikuCoreComponent.render(); // Expand the tree, ensuring new components are initialized
    createdHaikuCoreComponent.visitGuestHierarchy(function(instance) {
      instance.activate(); // Ensure all existing subcomponents are activated
    });
    return createdHaikuCoreComponent;
  };
  /**
   * @method mountApplication
   * @description Given an *optional* DOM element to mount, load the component and boostrap it inside the mount.
   * If no mount is provided (i.e. in non-DOM contexts) this method can also be used if you just want to reload
   * the data for the component instead of actually displaying it. This is used by the Timeline but also nominally
   * by the Glass.
   */
  ActiveComponent.prototype.mountApplication = function(
    $el,
    instanceConfig,
    cb
  ) {
    var _this = this;
    this.getMount().remountInto($el);
    this.codeReloadingOn();
    return this.reload(
      {
        hardReload: true,
        moduleReloadMethod: "basicReload",
        clearCacheOptions: {
          doClearEntityCaches: true
        }
      },
      instanceConfig,
      function(err) {
        _this.codeReloadingOff();
        if (err) {
          logger.error(
            "[active component (".concat(_this.project.getAlias(), ")]"),
            err
          );
          _this.emit("error", err);
          if (cb) {
            return cb(err);
          }
          return null;
        }
        _this._isMounted = true;
        _this.emit("update", "application-mounted");
        if (cb) {
          return cb();
        }
        return null;
      }
    );
  };
  ActiveComponent.prototype.sleepComponentsOn = function() {
    HaikuComponent.all().forEach(function(instance) {
      instance.sleepOn();
    });
  };
  ActiveComponent.prototype.sleepComponentsOff = function() {
    HaikuComponent.all().forEach(function(instance) {
      instance.sleepOff();
    });
  };
  ActiveComponent.prototype.isCodeReloading = function() {
    return this._isReloadingCode;
  };
  ActiveComponent.prototype.codeReloadingOn = function() {
    this._isReloadingCode = true;
    this.sleepComponentsOn();
    this.getMount().setOpacity(0.2);
  };
  ActiveComponent.prototype.codeReloadingOff = function() {
    this.getMount().setOpacity(1.0);
    this.sleepComponentsOff();
    this._isReloadingCode = false;
  };
  /**
   * @method moduleReplace
   * @description The more severe cousin of mountApplication which also displays a message on the view
   * indicating that reloading is occurring. This is really only used in the Glass, where code reload
   * events can interfere with what the user is doing and a UI lock of some kind is required.
   */
  ActiveComponent.prototype.moduleReplace = function(cb) {
    var _this = this;
    return Lock.request(Lock.LOCKS.ActiveComponentWork, false, function(
      release
    ) {
      _this.codeReloadingOn();
      return _this.reload(
        {
          hardReload: true,
          moduleReloadMethod: "reload",
          clearCacheOptions: {
            doClearEntityCaches: true
          }
        },
        null,
        function(err) {
          release();
          _this.codeReloadingOff();
          if (err) {
            logger.error(
              "[active component (".concat(_this.project.getAlias(), ")]"),
              err
            );
            return _this.emit("error", err);
          }
          return cb();
        }
      );
    });
  };
  /**
   * @method moduleSync
   * @description Basically identical to `moduleReplace`, but without reloading from disk.
   */
  ActiveComponent.prototype.moduleSync = function(cb) {
    var _this = this;
    return Lock.request(Lock.LOCKS.ActiveComponentWork, false, function(
      release
    ) {
      _this.codeReloadingOn();
      return _this.reload(
        {
          hardReload: true,
          moduleReloadMethod: "basicReload",
          clearCacheOptions: {
            doClearEntityCaches: true
          }
        },
        null,
        function(err) {
          release();
          _this.codeReloadingOff();
          if (err) {
            logger.error(
              "[active component (".concat(_this.project.getAlias(), ")]"),
              err
            );
            return _this.emit("error", err);
          }
          _this.fetchActiveBytecodeFile().requestAsyncContentFlush();
          return cb();
        }
      );
    });
  };
  ActiveComponent.prototype.fetchRootElement = function() {
    var staticTemplateNode = this.getReifiedBytecode().template;
    var uid = Element.makeUid(this, null, 0, staticTemplateNode);
    var found = Element.findById(uid);
    if (found) {
      return found;
    }
    return Element.upsertElementFromVirtualElement(
      this, // component
      staticTemplateNode,
      null, // parent element
      0, // index in parent
      "0"
    );
  };
  ActiveComponent.prototype.pushBytecodeSnapshot = function(done) {
    // Push our reified decycled bytecode into our local snapshots with no prejudice.
    // TODO: does this leak too much memory?
    this.snapshots.push(
      Bytecode.snapshot(
        this.fetchActiveBytecodeFile().getReifiedDecycledBytecode({
          suppressSubcomponents: false
        })
      )
    );
    done();
  };
  ActiveComponent.prototype.popBytecodeSnapshot = function(metadata, cb) {
    var _this = this;
    return this.project.updateHook(
      "popBytecodeSnapshot",
      this.getRelpath(),
      metadata,
      function(fire) {
        _this.fetchActiveBytecodeFile().updateInMemoryHotModule(
          // We are our own inversion, so the action stack will have pushed a snapshot onto the snapshot stack before we
          // got here. As a result, the snapshot we actually pop is the penultimate one in the stack and not the final
          // one.
          _this.snapshots.splice(_this.snapshots.length - 2, 1)[0],
          function() {
            _this.moduleSync(function() {
              fire();
              return cb();
            });
          }
        );
      }
    );
  };
  ActiveComponent.prototype.rehydrate = function(options) {
    if (options === void 0) {
      options = {};
    }
    // Don't allow any incoming syncs while we're in the midst of this
    BaseModel.__sync = false;
    this.cache.unset("displayableRows");
    this.cache.unset("getTemplateNodesByComponentId");
    // Required before rehydration because entities use the timeline entity
    Timeline.upsert(
      {
        uid: this.buildCurrentTimelineUid(),
        folder: this.project.getFolder(),
        name: this.getCurrentTimelineName(),
        component: this
      },
      {}
    );
    var root = this.fetchRootElement();
    Keyframe.where({ component: this }).forEach(function(keyframe) {
      return keyframe.mark();
    });
    Row.where({ component: this }).forEach(function(row) {
      return row.mark();
    });
    Element.where({ component: this }).forEach(function(element) {
      if (element !== root) {
        element.mark();
      }
    });
    // We *must* unset this or else stale elements will be left, messing up rehydration
    root.children = [];
    root.rehydrate(
      Object.assign({}, options, {
        maxRehydrationDepth: 1
      })
    );
    // Note that visitAll also visits self, so all elements' rows get rehydrated here
    root.visitAll(function(element) {
      element.rehydrateRows(options);
    });
    Element.where({ component: this }).forEach(function(element) {
      if (element !== root) {
        element.sweep();
      }
    });
    Row.where({ component: this }).forEach(function(row) {
      return row.sweep();
    });
    Keyframe.where({ component: this }).forEach(function(keyframe) {
      return keyframe.sweep();
    });
    var row = root.getAllRows()[0];
    if (row) {
      // Expand the first (topmost) row by default, only if this is the first run
      if (!row._wasInitiallyExpanded) {
        row._isExpanded = true;
        row._wasInitiallyExpanded = true;
      }
    }
    // Now that we have all the initial models ready, we can receive syncs
    BaseModel.__sync = true;
  };
  ActiveComponent.prototype.getReifiedBytecode = function() {
    return this.fetchActiveBytecodeFile().getReifiedBytecode();
  };
  ActiveComponent.prototype.getSerializedBytecode = function() {
    return this.fetchActiveBytecodeFile().getSerializedBytecode();
  };
  ActiveComponent.prototype.getBytecodeJSON = function(replacer, spacing) {
    return jss(this.getSerializedBytecode(), replacer, spacing);
  };
  ActiveComponent.prototype.getReifiedTemplate = function() {
    var reifiedBytecode = this.getReifiedBytecode();
    return reifiedBytecode && reifiedBytecode.template;
  };
  ActiveComponent.prototype.upsertProperties = function(
    bytecode,
    componentId,
    timelineName,
    timelineTime,
    propertiesToMerge,
    strategy
  ) {
    return Bytecode.upsertPropertyValue(
      bytecode,
      componentId,
      timelineName,
      timelineTime,
      propertiesToMerge,
      strategy
    );
  };
  ActiveComponent.prototype.getComponentId = function() {
    return this.getArtboard().getElementHaikuId();
  };
  ActiveComponent.prototype.isAutoSizeX = function() {
    return (
      this.getDeclaredPropertyValue(
        this.getComponentId(),
        this.getCurrentTimelineName(),
        this.getCurrentTimelineTime(),
        "sizeAbsolute.x"
      ) === "auto"
    );
  };
  ActiveComponent.prototype.isAutoSizeY = function() {
    return (
      this.getDeclaredPropertyValue(
        this.getComponentId(),
        this.getCurrentTimelineName(),
        this.getCurrentTimelineTime(),
        "sizeAbsolute.y"
      ) === "auto"
    );
  };
  ActiveComponent.prototype.getDeclaredPropertyValue = function(
    componentId,
    timelineName,
    timelineTime,
    propertyName
  ) {
    var bytecode = this.getReifiedBytecode();
    var propertyValue = Template.getPropertyValue(
      bytecode,
      componentId,
      timelineName,
      timelineTime,
      propertyName
    );
    // Suppose we instantiate an element, scale it, then undo
    // Since elements don't have an explicit scale set, our undoable
    // would have `undefined` values in the snapshot, which would
    // have the effect of *not* reverting the scale; so we grab the
    // fallback value just in case
    if (propertyValue === undefined || propertyValue === null) {
      var elementName = this.getElementNameOfComponentId(componentId);
      propertyValue = TimelineProperty.getFallbackValue(
        elementName,
        propertyName
      );
    }
    return propertyValue;
  };
  ActiveComponent.prototype.getDeclaredPropertyValues = function(
    componentId,
    timelineName,
    timelineTime,
    propertyNames
  ) {
    var _this = this;
    var out = {};
    propertyNames.forEach(function(propertyName) {
      out[propertyName] = _this.getDeclaredPropertyValue(
        componentId,
        timelineName,
        timelineTime,
        propertyName
      );
    });
    return out;
  };
  ActiveComponent.prototype.getStateDescriptor = function(stateName) {
    var states = this.getReifiedBytecode().states;
    return states && states[stateName];
  };
  ActiveComponent.prototype.getComputedPropertyValue = function(
    template,
    componentId,
    timelineName,
    timelineTime,
    propertyName,
    fallbackValue
  ) {
    var bytecode = this.getReifiedBytecode();
    var elementsById = Template.getAllElementsByHaikuId(template);
    var element = elementsById[componentId];
    var host = this.$instance;
    var states = (host && host.getStates()) || {};
    return TimelineProperty.getComputedValue(
      componentId,
      Element.safeElementName(element),
      propertyName,
      timelineName || DEFAULT_TIMELINE_NAME,
      timelineTime || DEFAULT_TIMELINE_TIME,
      fallbackValue,
      bytecode,
      host,
      states
    );
  };
  ActiveComponent.prototype.getContextSize = function() {
    return this.getContextSizeActual(
      this.getCurrentTimelineName(),
      this.getCurrentTimelineTime()
    );
  };
  ActiveComponent.prototype.getContextSizeActual = function(
    timelineName,
    timelineTime
  ) {
    var defaults = { width: 1, height: 1 }; // In case of race where collateral isn't ready yet
    var bytecode = this.getReifiedBytecode();
    if (!bytecode || !bytecode.template || !bytecode.template.attributes) {
      return defaults;
    }
    var contextHaikuId = bytecode.template.attributes[HAIKU_ID_ATTRIBUTE];
    if (!contextHaikuId) {
      return defaults;
    }
    var contextElementName = Element.safeElementName(bytecode.template);
    if (!contextElementName) {
      return defaults;
    }
    var modelElement = this.findElementByComponentId(contextHaikuId);
    // We can't get the HaikuElement nor compute a size if the live node is missing.
    // This guard is to ensure we don't crash in case of races or in a headless test context.
    if (!modelElement || !modelElement.getLiveRenderedNode()) {
      return defaults;
    }
    var haikuElement = modelElement.getHaikuElement();
    if (!haikuElement) {
      return defaults;
    }
    var host = this.$instance;
    var states = (host && host.getStates()) || {};
    var contextWidth = TimelineProperty.getComputedValue(
      contextHaikuId,
      contextElementName,
      "sizeAbsolute.x",
      timelineName || DEFAULT_TIMELINE_NAME,
      timelineTime || DEFAULT_TIMELINE_TIME,
      0,
      bytecode,
      host,
      states
    );
    var contextHeight = TimelineProperty.getComputedValue(
      contextHaikuId,
      contextElementName,
      "sizeAbsolute.y",
      timelineName || DEFAULT_TIMELINE_NAME,
      timelineTime || DEFAULT_TIMELINE_TIME,
      0,
      bytecode,
      host,
      states
    );
    if (typeof contextWidth !== "number") {
      contextWidth = haikuElement.computeSizeX();
    }
    if (typeof contextHeight !== "number") {
      contextHeight = haikuElement.computeSizeY();
    }
    return {
      width: contextWidth,
      height: contextHeight
    };
  };
  ActiveComponent.prototype.buildCurrentTimelineUid = function() {
    return this.getPrimaryKey() + "::" + this.getCurrentTimelineName();
  };
  ActiveComponent.prototype.getCurrentTimeline = function() {
    return Timeline.findById(this.buildCurrentTimelineUid());
  };
  ActiveComponent.prototype.getRows = function() {
    return Row.where({ component: this });
  };
  ActiveComponent.prototype.getKeyframes = function() {
    return Keyframe.where({ component: this });
  };
  ActiveComponent.prototype.getElements = function() {
    return Element.where({ component: this });
  };
  ActiveComponent.prototype.getLastTemplateNode = function() {
    var bytecode = this.getReifiedBytecode();
    return (
      bytecode &&
      bytecode.template &&
      bytecode.template.children &&
      bytecode.template.children[bytecode.template.children.length - 1]
    );
  };
  ActiveComponent.prototype.getFirstTemplateNode = function() {
    var bytecode = this.getReifiedBytecode();
    return (
      bytecode &&
      bytecode.template &&
      bytecode.template.children &&
      bytecode.template.children[0]
    );
  };
  ActiveComponent.prototype.getLastTemplateNodeHaikuId = function() {
    var node = this.getLastTemplateNode();
    return node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE];
  };
  ActiveComponent.prototype.getFirstTemplateNodeHaikuId = function() {
    var node = this.getFirstTemplateNode();
    return node && node.attributes && node.attributes[HAIKU_ID_ATTRIBUTE];
  };
  ActiveComponent.prototype.focusSelectNext = function(
    navDir,
    doFocus,
    metadata
  ) {
    return Row.focusSelectNext({ component: this }, navDir, doFocus, metadata);
  };
  ActiveComponent.prototype.getSelectedRows = function() {
    return Row.where({ component: this, _isSelected: true });
  };
  ActiveComponent.prototype.getSelectedElements = function() {
    return Element.where({ component: this, _isSelected: true });
  };
  ActiveComponent.prototype.getCurrentRows = function(criteria) {
    if (!criteria) {
      criteria = {};
    }
    criteria.component = this;
    return Row.where(criteria);
  };
  ActiveComponent.prototype.getDisplayableRowsGroupedByElementInZOrder = function() {
    var _this = this;
    var stack = this.getRawStackingInfo(
      this.getInstantiationTimelineName(),
      this.getInstantiationTimelineTime()
    ).reverse();
    var root = this.fetchRootElement();
    var rows = root.getHostedPropertyRows(false);
    var all = [].concat(rows);
    var groups = [
      {
        host: root,
        id: root.getComponentId(),
        rows: rows
      }
    ].concat(
      stack.reduce(function(acc, _a) {
        var haikuId = _a.haikuId;
        var child = _this.findElementByComponentId(haikuId);
        // Race condition when undoing multi-delete
        if (child) {
          var rows_1 = child.getHostedPropertyRows(true);
          all.push.apply(all, rows_1);
          acc.push({
            host: child,
            id: child.getComponentId(),
            rows: rows_1
          });
        }
        return acc;
      }, [])
    );
    // It's hacky to do this here but ultimately easier than finding the
    // right place to do it when rehydrating. Note that prev/next is only
    // used by Timeline in order to provide keyboard navigation of rows
    var first = all[0];
    var last = all[all.length - 1];
    all.forEach(function(row, index) {
      var prev = all[index - 1];
      row._prev = null;
      row._next = null;
      if (prev) {
        row._prev = prev;
        prev._next = row;
      }
    });
    first._prev = last;
    last._next = first;
    return groups;
  };
  ActiveComponent.prototype.getSelectedKeyframes = function() {
    return Keyframe.where({ component: this, _selected: true });
  };
  /**
   * Returns a boolean indicating if *all* of the selected keyframes
   * are the first non-zero keyframe in their row.
   *
   * @returns Boolean
   */
  ActiveComponent.prototype.checkIfSelectedKeyframesAreMovableToZero = function() {
    var selectedKeyframes = this.getSelectedKeyframes();
    var notMovable = selectedKeyframes.findIndex(function(keyframe) {
      return !(keyframe.prev() && keyframe.prev().origMs === 0);
    });
    return notMovable === -1;
  };
  ActiveComponent.prototype.getCurrentKeyframes = function(criteria) {
    if (!criteria) {
      criteria = {};
    }
    criteria.component = this;
    return Keyframe.where(criteria);
  };
  ActiveComponent.prototype.getFocusedRow = function() {
    return Row.getFocusedRow({ component: this }); // Only one instance per component
  };
  ActiveComponent.prototype.getSelectedRow = function() {
    return Row.getSelectedRow({ component: this }); // Only one instance per component
  };
  ActiveComponent.prototype.performComponentWork = function(worker, cb) {
    var _this = this;
    // Playback during an update creates difficult-to-debug conditions
    this.sleepComponentsOn();
    return Lock.request(Lock.LOCKS.FilePerformComponentWork, false, function(
      release
    ) {
      var finish = function(err) {
        var result = [];
        for (var _i = 1; _i < arguments.length; _i++) {
          result[_i - 1] = arguments[_i];
        }
        release();
        return cb.apply(void 0, __spreadArray([err], result, false));
      };
      var bytecode = _this.getReifiedBytecode();
      return worker(bytecode, bytecode.template, function(err) {
        var result = [];
        for (var _i = 1; _i < arguments.length; _i++) {
          result[_i - 1] = arguments[_i];
        }
        if (err) {
          return finish(err);
        }
        _this.handleUpdatedBytecode(bytecode);
        // Now that we're finished, we can resume on-stage playback
        _this.sleepComponentsOff();
        return finish.apply(void 0, __spreadArray([null], result, false));
      });
    });
  };
  ActiveComponent.prototype.handleUpdatedBytecode = function(bytecode) {
    var _this = this;
    Bytecode.cleanBytecode(bytecode);
    Template.cleanTemplate(bytecode.template);
    var file = this.fetchActiveBytecodeFile();
    file.updateInMemoryHotModule(bytecode, function() {
      _this.fetchActiveBytecodeFile().requestAsyncContentFlush();
    });
  };
  ActiveComponent.prototype.performComponentTimelinesWork = function(
    worker,
    finish
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      if (!bytecode) {
        return done(new Error("Missing bytecode"));
      }
      if (!bytecode.timelines) {
        return done(new Error("Missing timelines"));
      }
      return worker(bytecode, mana, bytecode.timelines, done);
    }, finish);
  };
  ActiveComponent.prototype.getKeyframeValue = function(
    componentId,
    timelineName,
    timelineTime,
    propertyName
  ) {
    var bytecode = this.getReifiedBytecode();
    var selector = "haiku:".concat(componentId);
    return (
      bytecode &&
      bytecode.timelines &&
      bytecode.timelines[timelineName] &&
      bytecode.timelines[timelineName][selector] &&
      bytecode.timelines[timelineName][selector][propertyName] &&
      bytecode.timelines[timelineName][selector][propertyName][timelineTime] &&
      bytecode.timelines[timelineName][selector][propertyName][timelineTime]
        .value
    );
  };
  ActiveComponent.prototype.getKeyframeCurve = function(
    componentId,
    timelineName,
    timelineTime,
    propertyName
  ) {
    var bytecode = this.getReifiedBytecode();
    var selector = "haiku:".concat(componentId);
    return (
      bytecode &&
      bytecode.timelines &&
      bytecode.timelines[timelineName] &&
      bytecode.timelines[timelineName][selector] &&
      bytecode.timelines[timelineName][selector][propertyName] &&
      bytecode.timelines[timelineName][selector][propertyName][timelineTime] &&
      bytecode.timelines[timelineName][selector][propertyName][timelineTime]
        .curve
    );
  };
  ActiveComponent.prototype.getElementNameOfComponentId = function(
    componentId
  ) {
    var element = this.findTemplateNodeByComponentId(
      this.getReifiedBytecode().template,
      componentId
    );
    return element && element.elementName;
  };
  ActiveComponent.prototype.getSafeElementNameOfComponentId = function(
    componentId
  ) {
    var element = this.findTemplateNodeByComponentId(
      this.getReifiedBytecode().template,
      componentId
    );
    return element && Element.safeElementName(element);
  };
  ActiveComponent.prototype.getTimelineDescriptor = function(timelineName) {
    var bytecode = this.getReifiedBytecode();
    return bytecode && bytecode.timelines && bytecode.timelines[timelineName];
  };
  ActiveComponent.prototype.getRawStackingInfo = function(
    timelineName,
    timelineTime
  ) {
    var bytecode = this.getReifiedBytecode();
    return Template.getStackingInfo(
      bytecode,
      bytecode.template,
      timelineName,
      timelineTime
    );
  };
  ActiveComponent.prototype.setZIndicesForStackingInfo = function(
    bytecode,
    timelineName,
    timelineTime,
    stackingInfo
  ) {
    var _this = this;
    // If we received items out of order, fix their z-indexes.
    stackingInfo.forEach(function(_a, arrayIndex) {
      var haikuId = _a.haikuId;
      _this.upsertProperties(
        bytecode,
        haikuId,
        timelineName,
        timelineTime,
        {
          "style.zIndex": arrayIndex + 1
        },
        "merge"
      );
    });
  };
  ActiveComponent.prototype.grabStackObjectFromStackingInfo = function(
    stackingInfo,
    componentId
  ) {
    for (var index = stackingInfo.length - 1; index >= 0; index--) {
      if (stackingInfo[index].haikuId === componentId) {
        return {
          ourStackObject: stackingInfo.splice(index, 1)[0],
          index: index
        };
      }
    }
  };
  /**
   * @method writeMetadata
   */
  ActiveComponent.prototype.writeMetadata = function(
    bytecodeMetadata,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "writeMetadata",
      this.getRelpath(),
      bytecodeMetadata,
      metadata,
      function(fire) {
        return _this.performComponentWork(
          function(bytecode, mana, done) {
            Bytecode.writeMetadata(
              bytecode,
              lodash.assign({}, bytecodeMetadata, { title: _this.getTitle() })
            );
            done();
          },
          function() {
            fire();
            cb();
          }
        );
      }
    );
  };
  /**
   * @method readMetadata
   */
  ActiveComponent.prototype.readMetadata = function(cb) {
    return cb(null, this.getReifiedBytecode().metadata || {});
  };
  /**
   * @method readAllEventHandlers
   */
  ActiveComponent.prototype.readAllEventHandlers = function(metadata, cb) {
    return this.readAllEventHandlersActual(cb);
  };
  ActiveComponent.prototype.readAllEventHandlersActual = function(cb) {
    var bytecode = this.getSerializedBytecode();
    return cb(null, Bytecode.readAllEventHandlers(bytecode));
  };
  /**
   * @method readAllStateValues
   */
  ActiveComponent.prototype.readAllStateValues = function(metadata, cb) {
    return this.readAllStateValuesActual(cb);
  };
  ActiveComponent.prototype.readAllStateValuesActual = function(cb) {
    var bytecode = this.getSerializedBytecode();
    return cb(null, Bytecode.readAllStateValues(bytecode));
  };
  /**
   * @method batchUpsertEventHandlers
   */
  ActiveComponent.prototype.batchUpsertEventHandlers = function(
    selectorName,
    eventsSerial,
    metadata,
    cb
  ) {
    var _this = this;
    var events = Bytecode.unserializeValue(eventsSerial, function(ref) {
      return _this.evaluateReference(ref);
    });
    return this.project.updateHook(
      "batchUpsertEventHandlers",
      this.getRelpath(),
      selectorName,
      Bytecode.serializeValue(events),
      metadata,
      function(fire) {
        return _this.batchUpsertEventHandlersActual(
          selectorName,
          events,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire();
                _this.project.broadcastPayload({
                  name: "event-handlers-updated"
                });
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.batchUpsertEventHandlersActual = function(
    selectorName,
    serializedEvents,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.batchUpsertEventHandlers(
        bytecode,
        selectorName,
        serializedEvents
      );
      done();
    }, cb);
  };
  /**
   * @method changeKeyframeValue
   */
  ActiveComponent.prototype.changeKeyframeValue = function(
    componentId,
    timelineName,
    propertyName,
    keyframeMs,
    newValueSerial,
    metadata,
    cb
  ) {
    var _this = this;
    var newValue = Bytecode.unserializeValue(newValueSerial, function(ref) {
      return _this.evaluateReference(ref);
    });
    return this.project.updateHook(
      "changeKeyframeValue",
      this.getRelpath(),
      componentId,
      timelineName,
      propertyName,
      keyframeMs,
      Bytecode.serializeValue(newValue),
      metadata,
      function(fire) {
        return _this.changeKeyframeValueActual(
          componentId,
          timelineName,
          propertyName,
          keyframeMs,
          newValue,
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                forceFlush: true,
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.changeKeyframeValueActual = function(
    componentId,
    timelineName,
    propertyName,
    keyframeMs,
    newValue,
    metadata,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.changeKeyframeValue(
        bytecode,
        componentId,
        timelineName,
        propertyName,
        keyframeMs,
        newValue
      );
      done();
    }, cb);
  };
  /**
   * @method changeSegmentCurve
   */
  ActiveComponent.prototype.changeSegmentCurve = function(
    componentId,
    timelineName,
    propertyName,
    keyframeMs,
    newCurveSerial,
    metadata,
    cb
  ) {
    var _this = this;
    var newCurve = Bytecode.unserializeValue(newCurveSerial, function(ref) {
      return _this.evaluateReference(ref);
    });
    return this.project.updateHook(
      "changeSegmentCurve",
      this.getRelpath(),
      componentId,
      timelineName,
      propertyName,
      keyframeMs,
      Bytecode.serializeValue(newCurve),
      metadata,
      function(fire) {
        return _this.changeSegmentCurveActual(
          componentId,
          timelineName,
          propertyName,
          keyframeMs,
          newCurve,
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                forceFlush: true,
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.changeSegmentCurveActual = function(
    componentId,
    timelineName,
    propertyName,
    keyframeMs,
    newCurve,
    metadata,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.changeSegmentCurve(
        bytecode,
        componentId,
        timelineName,
        propertyName,
        keyframeMs,
        newCurve
      );
      done();
    }, cb);
  };
  /**
   * @method joinKeyframes
   */
  ActiveComponent.prototype.joinKeyframes = function(
    componentId,
    timelineName,
    elementName,
    propertyName,
    keyframeMsLeft,
    keyframeMsRight,
    newCurveSerial,
    metadata,
    cb
  ) {
    var _this = this;
    var newCurve = Bytecode.unserializeValue(newCurveSerial, function(ref) {
      return _this.evaluateReference(ref);
    });
    return this.project.updateHook(
      "joinKeyframes",
      this.getRelpath(),
      componentId,
      timelineName,
      elementName,
      propertyName,
      keyframeMsLeft,
      keyframeMsRight,
      Bytecode.serializeValue(newCurve),
      metadata,
      function(fire) {
        return _this.joinKeyframesActual(
          componentId,
          timelineName,
          elementName,
          propertyName,
          keyframeMsLeft,
          keyframeMsRight,
          newCurve,
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: true,
                forceFlush: true,
                clearCacheOptions: {
                  doClearEntityCaches: true
                },
                customRehydrate: function() {
                  if (_this.project.isRemoteRequest(metadata)) {
                    _this.rehydrate();
                    return;
                  }
                  var element = _this.findElementByComponentId(componentId);
                  if (element) {
                    var row = element.getPropertyRowByPropertyName(
                      propertyName
                    );
                    if (row) {
                      var keyframe = row.getKeyframeByMs(keyframeMsLeft);
                      if (keyframe) {
                        keyframe.setCurve(newCurve);
                      }
                    }
                  }
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.joinKeyframesActual = function(
    componentId,
    timelineName,
    elementName,
    propertyName,
    keyframeMsLeft,
    keyframeMsRight,
    newCurve,
    metadata,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.joinKeyframes(
        bytecode,
        componentId,
        timelineName,
        elementName,
        propertyName,
        keyframeMsLeft,
        keyframeMsRight,
        newCurve
      );
      done();
    }, cb);
  };
  /**
   * @method splitSegment
   */
  ActiveComponent.prototype.splitSegment = function(
    componentId,
    timelineName,
    elementName,
    propertyName,
    keyframeMs,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "splitSegment",
      this.getRelpath(),
      componentId,
      timelineName,
      elementName,
      propertyName,
      keyframeMs,
      metadata,
      function(fire) {
        return _this.splitSegmentActual(
          componentId,
          timelineName,
          elementName,
          propertyName,
          keyframeMs,
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: true,
                forceFlush: true,
                clearCacheOptions: {
                  doClearEntityCaches: true
                },
                customRehydrate: function() {
                  if (_this.project.isRemoteRequest(metadata)) {
                    _this.rehydrate();
                    return;
                  }
                  var element = _this.findElementByComponentId(componentId);
                  if (element) {
                    var row = element.getPropertyRowByPropertyName(
                      propertyName
                    );
                    if (row) {
                      var keyframe = row.getKeyframeByMs(keyframeMs);
                      if (keyframe) {
                        keyframe.setCurve(null);
                      }
                    }
                  }
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.splitSegmentActual = function(
    componentId,
    timelineName,
    elementName,
    propertyName,
    keyframeMs,
    metadata,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.splitSegment(
        bytecode,
        componentId,
        timelineName,
        elementName,
        propertyName,
        keyframeMs
      );
      done();
    }, cb);
  };
  ActiveComponent.prototype.getKeyframesObjectForPropertyNames = function(
    timelineName,
    componentId,
    propertyNames
  ) {
    var bytecode = this.getReifiedBytecode() || {};
    var timeline = bytecode.timelines[timelineName] || {};
    var properties = timeline["haiku:".concat(componentId)] || {};
    var keyframes = {};
    propertyNames.forEach(function(propertyName) {
      keyframes[propertyName] = properties[propertyName];
    });
    return keyframes;
  };
  ActiveComponent.prototype.ensureZerothKeyframe = function(
    bytecode,
    timelineName,
    componentId,
    propertyName,
    fallbackToInitialKeyframeIfProvided
  ) {
    var _this = this;
    if (fallbackToInitialKeyframeIfProvided === void 0) {
      fallbackToInitialKeyframeIfProvided = true;
    }
    var selector = "haiku:".concat(componentId);
    if (!bytecode.timelines[timelineName]) {
      bytecode.timelines[timelineName] = {};
    }
    if (!bytecode.timelines[timelineName][selector]) {
      bytecode.timelines[timelineName][selector] = {};
    }
    if (!bytecode.timelines[timelineName][selector][propertyName]) {
      bytecode.timelines[timelineName][selector][propertyName] = {};
    }
    var descriptor = bytecode.timelines[timelineName][selector][propertyName];
    var keyframeNumbers = getSortedKeyframes(descriptor);
    var initialKeyframeMs = keyframeNumbers[0];
    var initialKeyframeObj =
      initialKeyframeMs !== undefined
        ? descriptor[initialKeyframeMs]
        : undefined;
    if (!descriptor[0]) {
      descriptor[0] = {};
    }
    if (descriptor[0].value === undefined) {
      if (fallbackToInitialKeyframeIfProvided && initialKeyframeObj) {
        descriptor[0].value = Bytecode.unserializeValue(
          initialKeyframeObj.value,
          function(ref) {
            return _this.evaluateReference(ref);
          }
        );
      } else {
        // Otherwise, use the fallback if we have no next keyframe defined
        var declaredValue = this.getDeclaredPropertyValue(
          componentId,
          timelineName,
          0,
          propertyName
        );
        descriptor[0].value = Bytecode.unserializeValue(declaredValue, function(
          ref
        ) {
          return _this.evaluateReference(ref);
        });
      }
    }
    if (descriptor[0].value === undefined) {
      // Set it to a reasonably safe value if we couldn't find one
      descriptor[0].value = 1;
    }
    // Avoid effects of design merge changes
    descriptor[0].edited = true;
  };
  /**
   * @method moveKeyframes
   */
  ActiveComponent.prototype.moveKeyframes = function(
    keyframeMovesSerial,
    metadata,
    cb
  ) {
    var _this = this;
    if (Object.keys(keyframeMovesSerial).length < 1) {
      return cb();
    }
    var keyframeMoves = Bytecode.unserializeValue(keyframeMovesSerial, function(
      ref
    ) {
      return _this.evaluateReference(ref);
    });
    return this.project.updateHook(
      "moveKeyframes",
      this.getRelpath(),
      Bytecode.serializeValue(keyframeMoves),
      metadata,
      function(fire) {
        return _this.moveKeyframesActual(keyframeMoves, metadata, function(
          err
        ) {
          if (err) {
            logger.error(
              "[active component (".concat(_this.project.getAlias(), ")]"),
              err
            );
            return cb(err);
          }
          return _this.reload(
            {
              hardReload: true,
              forceFlush: true,
              clearCacheOptions: {
                doClearEntityCaches: true
              },
              customRehydrate: function() {
                if (_this.project.isRemoteRequest(metadata)) {
                  _this.rehydrate();
                  return;
                }
                for (var timelineName in keyframeMoves) {
                  for (var componentId in keyframeMoves[timelineName]) {
                    var element = _this.findElementByComponentId(componentId);
                    if (!element) {
                      // Entity may not exist in all views
                      continue;
                    }
                    for (var propertyName in keyframeMoves[timelineName][
                      componentId
                    ]) {
                      var row = element.getPropertyRowByPropertyName(
                        propertyName
                      );
                      if (!row) {
                        // Entity may not exist in all views
                        continue;
                      }
                      // The pkey of keyframes is {row.pkey}+{keyframe.ms}. Since we've just modified
                      // the ms value through a move, we need to update its uid according to that new ms
                      // since when we rehydrate, we'll want upsertion to match the new ms value
                      // so we don't end up with extra objects or other stale things laying around
                      row.getKeyframes().forEach(function(keyframe) {
                        return keyframe.updateOwnMetadata();
                      });
                      row.rehydrate();
                    }
                  }
                }
              }
            },
            null,
            function() {
              fire();
              return cb();
            }
          );
        });
      }
    );
  };
  ActiveComponent.prototype.moveKeyframesActual = function(
    keyframeMoves,
    metadata,
    cb
  ) {
    var _this = this;
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.moveKeyframes(bytecode, keyframeMoves);
      for (var timelineName in keyframeMoves) {
        for (var componentId in keyframeMoves[timelineName]) {
          for (var propertyName in keyframeMoves[timelineName][componentId]) {
            _this.ensureZerothKeyframe(
              bytecode,
              timelineName,
              componentId,
              propertyName,
              true
            );
          }
        }
      }
      // Clear timeline caches; the max frame might have changed.
      Timeline.clearCaches();
      done();
    }, cb);
  };
  /**
   * @method updateKeyframes
   */
  ActiveComponent.prototype.updateKeyframes = function(
    keyframeUpdatesSerial,
    options,
    metadata,
    cb
  ) {
    var _this = this;
    var keyframeUpdates = Bytecode.unserializeValue(
      keyframeUpdatesSerial,
      function(ref) {
        return _this.evaluateReference(ref);
      }
    );
    return this.project.updateHook(
      "updateKeyframes",
      this.getRelpath(),
      Bytecode.serializeValue(keyframeUpdates),
      options,
      metadata,
      function(fire) {
        var unlockedDesigns = {};
        if (options.setElementLockStatus) {
          for (var elID in options.setElementLockStatus) {
            var node = _this.findTemplateNodeByComponentId(
              _this.getReifiedBytecode().template,
              elID
            );
            if (!node || !node.attributes[HAIKU_SOURCE_ATTRIBUTE]) {
              continue;
            }
            var lockStatus = options.setElementLockStatus[elID];
            if (
              !lockStatus &&
              node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(
                SYNC_LOCKED_ID_SUFFIX
              )
            ) {
              node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[
                HAIKU_SOURCE_ATTRIBUTE
              ].replace(SYNC_LOCKED_ID_SUFFIX, "");
              unlockedDesigns[node.attributes[HAIKU_SOURCE_ATTRIBUTE]] = true;
            } else if (
              lockStatus &&
              !node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(
                SYNC_LOCKED_ID_SUFFIX
              )
            ) {
              node.attributes[HAIKU_SOURCE_ATTRIBUTE] =
                node.attributes[HAIKU_SOURCE_ATTRIBUTE] + SYNC_LOCKED_ID_SUFFIX;
            }
          }
        }
        return _this.updateKeyframesActual(
          keyframeUpdates,
          { unlockedDesigns: unlockedDesigns },
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                forceFlush: !!metadata.cursor,
                hotComponents: keyframeUpdatesToHotComponentDescriptors(
                  keyframeUpdates
                ),
                clearCacheOptions: {
                  doClearEntityCaches: !!metadata.cursor
                },
                customRehydrate: function() {
                  var componentIds = {};
                  var _loop_2 = function(timelineName) {
                    var _loop_3 = function(componentId) {
                      // Only run once for each component id
                      if (componentIds[componentId]) {
                        return "continue";
                      }
                      componentIds[componentId] = true;
                      var element = _this.findElementByComponentId(componentId);
                      // Not all views necessarily have the same collection of elements
                      if (element) {
                        element.rehydrateRows();
                        Row.where({
                          component: _this,
                          element: element
                        }).forEach(function(row) {
                          if (
                            experimentIsEnabled(
                              Experiment.ExpandTimelinePropertiesFromStageChanges
                            )
                          ) {
                            if (
                              row.property &&
                              keyframeUpdates[timelineName][componentId][
                                row.property.name
                              ]
                            ) {
                              row.expand(metadata);
                            }
                          }
                        });
                      }
                    };
                    for (var componentId in keyframeUpdates[timelineName]) {
                      _loop_3(componentId);
                    }
                  };
                  for (var timelineName in keyframeUpdates) {
                    _loop_2(timelineName);
                  }
                  if (options.setElementLockStatus) {
                    for (var elID in options.setElementLockStatus) {
                      var element = _this.findElementByComponentId(elID);
                      Row.where({ component: _this, element: element }).forEach(
                        function(row) {
                          row.rehydrate();
                        }
                      );
                    }
                  }
                }
              },
              null,
              function() {
                fire();
                // Because the serialization layer runs in non-rAF mode, we need to manually tick
                // after updating keyframes.
                _this.tick();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.updateKeyframesActual = function(
    keyframeUpdates,
    _a,
    metadata,
    cb
  ) {
    var _this = this;
    var unlockedDesigns = _a.unlockedDesigns;
    return this.performComponentWork(function(bytecode, mana, done) {
      for (var timelineName in keyframeUpdates) {
        if (!bytecode.timelines[timelineName]) {
          bytecode.timelines[timelineName] = {};
        }
        for (var componentId in keyframeUpdates[timelineName]) {
          var selector = Template.buildHaikuIdSelector(componentId);
          if (!bytecode.timelines[timelineName][selector]) {
            bytecode.timelines[timelineName][selector] = {};
          }
          for (var propertyName in keyframeUpdates[timelineName][componentId]) {
            if (!bytecode.timelines[timelineName][selector][propertyName]) {
              bytecode.timelines[timelineName][selector][propertyName] = {};
            }
            for (var keyframeMs in keyframeUpdates[timelineName][componentId][
              propertyName
            ]) {
              var propertyObj =
                keyframeUpdates[timelineName][componentId][propertyName][
                  keyframeMs
                ];
              if (propertyObj === null) {
                // Special directive to remove this property if defined.
                delete bytecode.timelines[timelineName][selector][propertyName][
                  keyframeMs
                ];
                continue;
              }
              if (
                !bytecode.timelines[timelineName][selector][propertyName][
                  keyframeMs
                ]
              ) {
                bytecode.timelines[timelineName][selector][propertyName][
                  keyframeMs
                ] = {};
              }
              var keyfVal =
                typeof propertyObj.value === "function"
                  ? propertyObj.value
                  : lodash.clone(propertyObj.value);
              bytecode.timelines[timelineName][selector][propertyName][
                keyframeMs
              ].value = keyfVal;
              // Note: we set fallbackToInitialKeyframeIfProvided to `false` here, ensuring that we always use the
              // "implicit" value for properties whose first keyframes are created at a time after t = 0.
              _this.ensureZerothKeyframe(
                bytecode,
                timelineName,
                componentId,
                propertyName,
                false
              );
              if (experimentIsEnabled(Experiment.AutoTweenNewKeyframes)) {
                Bytecode.addDefaultCurveIfNecessary(
                  bytecode,
                  timelineName,
                  selector,
                  keyframeMs,
                  propertyName,
                  componentId,
                  _this.getElementNameOfComponentId(componentId)
                );
              }
            }
          }
        }
      }
      // Clear timeline caches; the max frame might have changed.
      Timeline.clearCaches();
      _this.mergeDesignFilesImpl(
        unlockedDesigns,
        bytecode,
        { mergeRemovedOutputs: false },
        done
      );
    }, cb);
  };
  ActiveComponent.prototype.updateTypesActual = function(
    typeUpdates,
    metadata,
    cb
  ) {
    var _this = this;
    return this.performComponentWork(function(bytecode, mana, done) {
      for (var id in typeUpdates) {
        var node = _this.locateTemplateNodeByComponentId(id);
        node.elementName = typeUpdates[id];
      }
      done();
    }, cb);
  };
  ActiveComponent.prototype.updateKeyframesAndTypes = function(
    keyframeUpdatesSerial,
    typeUpdates,
    options,
    metadata,
    cb
  ) {
    var _this = this;
    var keyframeUpdates = Bytecode.unserializeValue(
      keyframeUpdatesSerial,
      function(ref) {
        return _this.evaluateReference(ref);
      }
    );
    return this.project.updateHook(
      "updateKeyframesAndTypes",
      this.getRelpath(),
      Bytecode.serializeValue(keyframeUpdates),
      typeUpdates,
      options,
      metadata,
      function(fire) {
        var unlockedDesigns = {};
        if (options.setElementLockStatus) {
          for (var elID in options.setElementLockStatus) {
            var node = _this.findTemplateNodeByComponentId(
              _this.getReifiedBytecode().template,
              elID
            );
            if (!node || !node.attributes[HAIKU_SOURCE_ATTRIBUTE]) {
              continue;
            }
            var lockStatus = options.setElementLockStatus[elID];
            if (
              !lockStatus &&
              node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(
                SYNC_LOCKED_ID_SUFFIX
              )
            ) {
              node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[
                HAIKU_SOURCE_ATTRIBUTE
              ].replace(SYNC_LOCKED_ID_SUFFIX, "");
              unlockedDesigns[node.attributes[HAIKU_SOURCE_ATTRIBUTE]] = true;
            } else if (
              lockStatus &&
              !node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(
                SYNC_LOCKED_ID_SUFFIX
              )
            ) {
              node.attributes[HAIKU_SOURCE_ATTRIBUTE] =
                node.attributes[HAIKU_SOURCE_ATTRIBUTE] + SYNC_LOCKED_ID_SUFFIX;
            }
          }
        }
        return _this.updateKeyframesActual(
          keyframeUpdates,
          { unlockedDesigns: unlockedDesigns },
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.updateTypesActual(typeUpdates, metadata, function(
              err
            ) {
              if (err) {
                logger.error(
                  "[active component (".concat(_this.project.getAlias(), ")]"),
                  err
                );
                return cb(err);
              }
              return _this.reload(
                {
                  hardReload: _this.project.isRemoteRequest(metadata),
                  forceFlush: !!metadata.cursor,
                  hotComponents: keyframeUpdatesToHotComponentDescriptors(
                    keyframeUpdates
                  ),
                  clearCacheOptions: {
                    doClearEntityCaches: !!metadata.cursor
                  },
                  customRehydrate: function() {
                    var componentIds = {};
                    for (var timelineName in keyframeUpdates) {
                      for (var componentId in keyframeUpdates[timelineName]) {
                        componentIds[componentId] = true;
                      }
                    }
                    for (var id in typeUpdates) {
                      componentIds[id] = true;
                    }
                    if (options.setElementLockStatus) {
                      for (var elID in options.setElementLockStatus) {
                        componentIds[elID] = true;
                      }
                    }
                    for (var id in componentIds) {
                      var el = _this.findElementByComponentId(id);
                      if (el) {
                        el.rehydrateRows();
                      }
                    }
                  }
                },
                null,
                function() {
                  fire();
                  return cb();
                }
              );
            });
          }
        );
      }
    );
  };
  /**
   * @method createKeyframe
   */
  ActiveComponent.prototype.createKeyframe = function(
    componentId,
    timelineName,
    elementName,
    propertyName,
    keyframeStartMs,
    keyframeValueSerial,
    keyframeCurveSerial,
    keyframeEndMs,
    keyframeEndValueSerial,
    options,
    metadata,
    cb
  ) {
    var _this = this;
    var keyframeValue = Bytecode.unserializeValue(keyframeValueSerial, function(
      ref
    ) {
      return _this.evaluateReference(ref);
    });
    var keyframeCurve = Bytecode.unserializeValue(keyframeCurveSerial, function(
      ref
    ) {
      return _this.evaluateReference(ref);
    });
    var keyframeEndValue = Bytecode.unserializeValue(
      keyframeEndValueSerial,
      function(ref) {
        return _this.evaluateReference(ref);
      }
    );
    var element = this.findElementByComponentId(componentId);
    var actualKeyframeStartMs =
      element && !Property.canHaveKeyframes(propertyName, element)
        ? 0
        : keyframeStartMs;
    return this.project.updateHook(
      "createKeyframe",
      this.getRelpath(),
      componentId,
      timelineName,
      elementName,
      propertyName,
      actualKeyframeStartMs,
      Bytecode.serializeValue(keyframeValue),
      Bytecode.serializeValue(keyframeCurve),
      keyframeEndMs,
      Bytecode.serializeValue(keyframeEndValue),
      options,
      metadata,
      function(fire) {
        var unlockedDesigns = {};
        if (options && options.setElementLockStatus) {
          for (var elID in options.setElementLockStatus) {
            var node = _this.findTemplateNodeByComponentId(
              _this.getReifiedBytecode().template,
              elID
            );
            if (!node || !node.attributes[HAIKU_SOURCE_ATTRIBUTE]) {
              continue;
            }
            var lockStatus = options.setElementLockStatus[elID];
            if (
              !lockStatus &&
              node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(
                SYNC_LOCKED_ID_SUFFIX
              )
            ) {
              node.attributes[HAIKU_SOURCE_ATTRIBUTE] = node.attributes[
                HAIKU_SOURCE_ATTRIBUTE
              ].replace(SYNC_LOCKED_ID_SUFFIX, "");
              unlockedDesigns[node.attributes[HAIKU_SOURCE_ATTRIBUTE]] = true;
            } else if (
              lockStatus &&
              !node.attributes[HAIKU_SOURCE_ATTRIBUTE].endsWith(
                SYNC_LOCKED_ID_SUFFIX
              )
            ) {
              node.attributes[HAIKU_SOURCE_ATTRIBUTE] =
                node.attributes[HAIKU_SOURCE_ATTRIBUTE] + SYNC_LOCKED_ID_SUFFIX;
            }
          }
        }
        return _this.createKeyframeActual(
          componentId,
          timelineName,
          elementName,
          propertyName,
          actualKeyframeStartMs,
          keyframeValue,
          keyframeCurve,
          keyframeEndMs,
          keyframeEndValue,
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: true,
                clearCacheOptions: {
                  doClearEntityCaches: true
                },
                customRehydrate: function() {
                  if (_this.project.isRemoteRequest(metadata)) {
                    _this.rehydrate();
                    return;
                  }
                  if (!element) {
                    // Entity may not exist in all views
                    return;
                  }
                  var row = element.getPropertyRowByPropertyName(propertyName);
                  if (!row) {
                    // Entity may not exist in all views
                    return;
                  }
                  row.getKeyframes().forEach(function(keyframe) {
                    return keyframe.updateOwnMetadata();
                  });
                  row.rehydrate();
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.createKeyframeActual = function(
    componentId,
    timelineName,
    elementName,
    propertyName,
    keyframeStartMs,
    keyframeValue,
    keyframeCurve,
    keyframeEndMs,
    keyframeEndValue,
    metadata,
    cb
  ) {
    var _this = this;
    return this.performComponentWork(function(bytecode, mana, done) {
      var host = _this.$instance;
      var states = (host && host.getStates()) || {};
      Bytecode.createKeyframe(
        bytecode,
        componentId,
        timelineName,
        elementName,
        propertyName,
        keyframeStartMs,
        keyframeValue,
        keyframeCurve,
        keyframeEndMs,
        keyframeEndValue,
        host,
        states
      );
      _this.ensureZerothKeyframe(
        bytecode,
        timelineName,
        componentId,
        propertyName,
        false
      );
      if (experimentIsEnabled(Experiment.AutoTweenNewKeyframes)) {
        Bytecode.addDefaultCurveIfNecessary(
          bytecode,
          timelineName,
          Template.buildHaikuIdSelector(componentId),
          keyframeStartMs,
          propertyName,
          componentId,
          elementName
        );
      }
      done();
    }, cb);
  };
  /**
   * @method deleteKeyframe
   */
  ActiveComponent.prototype.deleteKeyframe = function(
    componentId,
    timelineName,
    propertyName,
    keyframeMs,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "deleteKeyframe",
      this.getRelpath(),
      componentId,
      timelineName,
      propertyName,
      keyframeMs,
      metadata,
      function(fire) {
        return _this.deleteKeyframeActual(
          componentId,
          timelineName,
          propertyName,
          keyframeMs,
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            // In case we ended up with a materially different, immutable-looking property group after removing a
            // second-from-last keyframe, request a force flush.
            return _this.reload(
              {
                hardReload: true,
                clearCacheOptions: {
                  doClearEntityCaches: true
                },
                customRehydrate: function() {
                  if (_this.project.isRemoteRequest(metadata)) {
                    _this.rehydrate();
                    return;
                  }
                  var element = _this.findElementByComponentId(componentId);
                  if (!element) {
                    // Entity may not exist in all views
                    return;
                  }
                  var row = element.getPropertyRowByPropertyName(propertyName);
                  if (!row) {
                    // Entity may not exist in all views
                    return;
                  }
                  row.getKeyframes().forEach(function(keyframe) {
                    return keyframe.updateOwnMetadata();
                  });
                  row.rehydrate();
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.deleteKeyframeActual = function(
    componentId,
    timelineName,
    propertyName,
    keyframeMs,
    metadata,
    cb
  ) {
    var _this = this;
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.deleteKeyframe(
        bytecode,
        componentId,
        timelineName,
        propertyName,
        keyframeMs
      );
      _this.ensureZerothKeyframe(
        bytecode,
        timelineName,
        componentId,
        propertyName,
        true
      );
      done();
    }, cb);
  };
  Object.defineProperty(ActiveComponent.prototype, "nextSuggestedGroupName", {
    get: function() {
      var reservations = [];
      this.getElements().forEach(function(element) {
        var title = element.getTitle();
        if (!title || typeof title !== "string") {
          return;
        }
        var matches = element.getTitle().match(/^group (\d+)$/i);
        if (matches) {
          reservations.push(Number(matches[1]));
        }
      });
      var next = Math.max.apply(Math, reservations);
      return "Group ".concat(isFinite(next) ? next + 1 : 1);
    },
    enumerable: false,
    configurable: true
  });
  /**
   * @method groupElements
   */
  ActiveComponent.prototype.groupElements = function(
    componentIds,
    groupMana,
    coords,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "groupElements",
      this.getRelpath(),
      componentIds,
      groupMana,
      coords,
      metadata,
      function(fire) {
        return _this.groupElementsActual(
          componentIds,
          groupMana,
          coords,
          metadata,
          function(err, groupComponentId) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: true,
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire(null, groupComponentId);
                _this
                  .findElementByComponentId(groupComponentId)
                  .select(metadata);
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.groupElementsActual = function(
    componentIds,
    groupManaIn,
    coords,
    metadata,
    cb
  ) {
    var _this = this;
    // Make a copy so that we don't have to decycle.
    var groupMana = lodash.cloneDeep(groupManaIn);
    var originalTimeline = this.getTimelineDescriptor(
      this.getCurrentTimelineName()
    );
    return this.performComponentWork(function(bytecode, mana, done) {
      var timelineName = _this.getInstantiationTimelineName();
      var timelineTime = _this.getInstantiationTimelineTime();
      var groupComponentId = _this.instantiateManaInBytecode(
        groupMana,
        bytecode,
        {},
        coords
      );
      var nodesToRegroup = [];
      var _loop_4 = function(i) {
        var node = mana.children[i];
        if (!node.attributes) {
          return "continue";
        }
        if (componentIds.indexOf(node.attributes[HAIKU_ID_ATTRIBUTE]) !== -1) {
          var timelineSelector = "haiku:".concat(
            node.attributes[HAIKU_ID_ATTRIBUTE]
          );
          // Add to a list of nodes we want to regroup
          nodesToRegroup.push(node);
          // Remove node from its existing parent
          mana.children.splice(i, 1);
          // Clobber all layout properties using their current values.
          if (!originalTimeline[timelineSelector]) {
            return "continue";
          }
          var propertyGroup = Object.keys(
            originalTimeline[timelineSelector]
          ).reduce(function(accumulator, propertyName) {
            if (LAYOUT_3D_SCHEMA[propertyName]) {
              accumulator[propertyName] = {
                0: {
                  value: _this.getComputedPropertyValue(
                    mana,
                    node.attributes[HAIKU_ID_ATTRIBUTE],
                    timelineName,
                    _this.getCurrentTimelineTime(),
                    propertyName,
                    undefined
                  )
                }
              };
            }
            return accumulator;
          }, {});
          Bytecode.replaceTimelinePropertyGroups(
            bytecode,
            timelineName,
            timelineSelector,
            propertyGroup
          );
        }
      };
      // We only allow grouping of the top level elements, hence iterating children, not visiting
      for (var i = mana.children.length - 1; i >= 0; i--) {
        _loop_4(i);
      }
      groupMana.children[0].children = nodesToRegroup;
      // Place the new group at the top.
      var stackingInfo = Template.getStackingInfo(
        bytecode,
        mana,
        timelineName,
        timelineTime
      );
      var stackObject = _this.grabStackObjectFromStackingInfo(
        stackingInfo,
        groupComponentId
      );
      // Don't know why, but sometimes the stack object can be undefined
      var ourStackObject = stackObject && stackObject.ourStackObject;
      if (ourStackObject) {
        stackingInfo.push(ourStackObject); // Push to front
      } else {
        logger.warn(
          "[active component] stack object missing at "
            .concat(timelineName, " ")
            .concat(timelineTime)
        );
      }
      _this.setZIndicesForStackingInfo(
        bytecode,
        timelineName,
        timelineTime,
        stackingInfo
      );
      done(null, groupComponentId);
    }, cb);
  };
  /**
   * @method ungroupElements
   */
  ActiveComponent.prototype.ungroupElements = function(
    componentId,
    nodes,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "ungroupElements",
      this.getRelpath(),
      componentId,
      nodes,
      metadata,
      function(fire) {
        var clonedNodes = lodash.cloneDeep(nodes);
        return _this.ungroupElementsActual(
          componentId,
          clonedNodes,
          metadata,
          function(err, ungroupedComponentIds) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: true,
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire(null, ungroupedComponentIds);
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.ungroupElementsActual = function(
    componentId,
    nodes,
    metadata,
    cb
  ) {
    var _this = this;
    return this.performComponentWork(function(bytecode, mana, done) {
      // `nodes` is an array of clean mana we can instantiate as-is.
      var updatedComponentIds = nodes.map(function(node) {
        var componentId = _this.instantiateManaInBytecode(
          node,
          bytecode,
          {},
          undefined
        );
        Template.visitManaTree(node, function(
          elementName,
          attributes,
          children,
          componentMana
        ) {
          // Resolve and destroy the special haiku-transclude here. This special property provides an outlet for the
          // original component's children, so that we don't need to recalculate layouts and properties for every
          // subelement.
          if (attributes && attributes["haiku-transclude"]) {
            var originalComponent = _this.getTemplateNodesByComponentId()[
              attributes["haiku-transclude"]
            ];
            if (originalComponent) {
              children.push.apply(children, originalComponent.children);
              // If we are looking at a proper subcomponent, reassign the elementName to its transcluded bytecode.
              if (elementName === "__component__") {
                componentMana.elementName = originalComponent.elementName;
                attributes["haiku-var"] =
                  originalComponent.attributes["haiku-var"];
              }
            }
            delete attributes["haiku-transclude"];
          }
        });
        return componentId;
      });
      _this.deleteElementImpl(mana, componentId);
      done(null, updatedComponentIds);
    }, cb);
  };
  /**
   * @method upsertStateValue
   */
  ActiveComponent.prototype.upsertStateValue = function(
    stateName,
    stateDescriptorSerial,
    metadata,
    cb
  ) {
    var _this = this;
    var stateDescriptor = Bytecode.unserializeValue(
      stateDescriptorSerial,
      function(ref) {
        return _this.evaluateReference(ref);
      }
    );
    return this.project.updateHook(
      "upsertStateValue",
      this.getRelpath(),
      stateName,
      Bytecode.serializeValue(stateDescriptor),
      metadata,
      function(fire) {
        stateDescriptor.edited = true;
        return _this.upsertStateValueActual(
          stateName,
          stateDescriptor,
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                forceFlush: true,
                clearCacheOptions: {
                  doClearEntityCaches: true,
                  clearStates: true
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.upsertStateValueActual = function(
    stateName,
    stateDescriptor,
    metadata,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.upsertStateValue(bytecode, stateName, stateDescriptor);
      done();
    }, cb);
  };
  /**
   * @method deleteStateValue
   */
  ActiveComponent.prototype.deleteStateValue = function(
    stateName,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "deleteStateValue",
      this.getRelpath(),
      stateName,
      metadata,
      function(fire) {
        return _this.deleteStateValueActual(stateName, metadata, function(err) {
          if (err) {
            logger.error(
              "[active component (".concat(_this.project.getAlias(), ")]"),
              err
            );
            return cb(err);
          }
          return _this.reload(
            {
              hardReload: _this.project.isRemoteRequest(metadata),
              forceFlush: true,
              clearCacheOptions: {
                doClearEntityCaches: true,
                clearStates: true
              }
            },
            null,
            function() {
              fire();
              return cb();
            }
          );
        });
      }
    );
  };
  ActiveComponent.prototype.deleteStateValueActual = function(
    stateName,
    metadata,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.deleteStateValue(bytecode, stateName);
      done();
    }, cb);
  };
  /**
   * @method zShiftIndices
   *
   * @param {string} componentId ID of the component to change the zIndex value
   * @param {string} timelineName Name of the timeline
   * @param {string} timelineTime Time in which the change should be saved
   * @param {string} newIndex New zIndex value
   * @param {object} metadata
   * @param {function} cb
   */
  ActiveComponent.prototype.zShiftIndices = function(
    componentId,
    timelineName,
    timelineTime,
    newIndex,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "zShiftIndices",
      this.getRelpath(),
      componentId,
      timelineName,
      timelineTime,
      newIndex,
      metadata,
      function(fire) {
        return _this.zShiftIndicesActual(
          componentId,
          timelineName,
          timelineTime,
          newIndex,
          metadata,
          function(err, stackingInfo) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                forceFlush: true, // Since z-changes are fixed to frame 0, we must force flush to reflect the change at all frames
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.zShiftIndicesImpl = function(
    bytecode,
    componentId,
    timelineName,
    timelineTime,
    newIndex
  ) {
    var stackingInfo = Template.getStackingInfo(
      bytecode,
      bytecode.template,
      timelineName,
      timelineTime
    );
    this.grabStackObjectFromStackingInfo(stackingInfo, componentId);
    stackingInfo.splice(newIndex, 0, {
      haikuId: componentId,
      zIndex: newIndex
    });
    this.setZIndicesForStackingInfo(
      bytecode,
      timelineName,
      timelineTime,
      stackingInfo
    );
    return stackingInfo;
  };
  ActiveComponent.prototype.zShiftIndicesActual = function(
    componentId,
    timelineName,
    timelineTime,
    newIndex,
    metadata,
    cb
  ) {
    var _this = this;
    var stackingInfo;
    return this.performComponentTimelinesWork(
      function(bytecode, mana, timelines, done) {
        stackingInfo = _this.zShiftIndicesImpl(
          bytecode,
          componentId,
          timelineName,
          timelineTime,
          newIndex
        );
        done();
      },
      function(err) {
        cb(err, stackingInfo);
      }
    );
  };
  /**
   * @method zMoveToFront
   */
  ActiveComponent.prototype.zMoveToFront = function(
    componentId,
    timelineName,
    timelineTime,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "zMoveToFront",
      this.getRelpath(),
      componentId,
      timelineName,
      timelineTime,
      metadata,
      function(fire) {
        return _this.zMoveToFrontActual(
          componentId,
          timelineName,
          timelineTime,
          metadata,
          function(err, stackingInfo) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                forceFlush: true, // Since z-changes are fixed to frame 0, we must force flush to reflect the change at all frames
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.zMoveToFrontImpl = function(
    bytecode,
    componentId,
    timelineName,
    timelineTime
  ) {
    var stackingInfo = Template.getStackingInfo(
      bytecode,
      bytecode.template,
      timelineName,
      timelineTime
    );
    this.grabStackObjectFromStackingInfo(stackingInfo, componentId);
    stackingInfo.push({
      haikuId: componentId,
      zIndex:
        stackingInfo.length > 0
          ? stackingInfo[stackingInfo.length - 1].zIndex + 1
          : 1
    });
    this.setZIndicesForStackingInfo(
      bytecode,
      timelineName,
      timelineTime,
      stackingInfo
    );
    return stackingInfo;
  };
  ActiveComponent.prototype.zMoveToFrontActual = function(
    componentId,
    timelineName,
    timelineTime,
    metadata,
    cb
  ) {
    var _this = this;
    var stackingInfo;
    return this.performComponentTimelinesWork(
      function(bytecode, mana, timelines, done) {
        stackingInfo = _this.zMoveToFrontImpl(
          bytecode,
          componentId,
          timelineName,
          timelineTime
        );
        done();
      },
      function(err) {
        cb(err, stackingInfo);
      }
    );
  };
  /**
   * @method zMoveForward
   */
  ActiveComponent.prototype.zMoveForward = function(
    componentId,
    timelineName,
    timelineTime,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "zMoveForward",
      this.getRelpath(),
      componentId,
      timelineName,
      timelineTime,
      metadata,
      function(fire) {
        return _this.zMoveForwardActual(
          componentId,
          timelineName,
          timelineTime,
          metadata,
          function(err, stackingInfo) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                forceFlush: true, // Since z-changes are fixed to frame 0, we must force flush to reflect the change at all frames
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.zMoveForwardActual = function(
    componentId,
    timelineName,
    timelineTime,
    metadata,
    cb
  ) {
    var _this = this;
    var stackingInfo;
    return this.performComponentTimelinesWork(
      function(bytecode, mana, timelines, done) {
        stackingInfo = Template.getStackingInfo(
          bytecode,
          mana,
          timelineName,
          timelineTime
        );
        var stackObject = _this.grabStackObjectFromStackingInfo(
          stackingInfo,
          componentId
        );
        var ourStackObject = stackObject && stackObject.ourStackObject;
        // Don't know why, but for some reason stackObject can be undefined
        if (ourStackObject) {
          var index = stackObject.index;
          stackingInfo.splice(index + 1, 0, ourStackObject);
        } else {
          logger.warn(
            "[active component] stack object missing at "
              .concat(timelineName, " ")
              .concat(timelineTime)
          );
        }
        _this.setZIndicesForStackingInfo(
          bytecode,
          timelineName,
          timelineTime,
          stackingInfo
        );
        done();
      },
      function(err) {
        cb(err, stackingInfo);
      }
    );
  };
  /**
   * @method zMoveBackward
   */
  ActiveComponent.prototype.zMoveBackward = function(
    componentId,
    timelineName,
    timelineTime,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "zMoveBackward",
      this.getRelpath(),
      componentId,
      timelineName,
      timelineTime,
      metadata,
      function(fire) {
        return _this.zMoveBackwardActual(
          componentId,
          timelineName,
          timelineTime,
          metadata,
          function(err, stackingInfo) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                forceFlush: true, // Since z-changes are fixed to frame 0, we must force flush to reflect the change at all frames
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.zMoveBackwardActual = function(
    componentId,
    timelineName,
    timelineTime,
    metadata,
    cb
  ) {
    var _this = this;
    var stackingInfo;
    return this.performComponentTimelinesWork(
      function(bytecode, mana, timelines, done) {
        stackingInfo = Template.getStackingInfo(
          bytecode,
          mana,
          timelineName,
          timelineTime
        );
        var stackObject = _this.grabStackObjectFromStackingInfo(
          stackingInfo,
          componentId
        );
        var ourStackObject = stackObject && stackObject.ourStackObject;
        // Don't know why, but for some reason stackObject can be undefined
        if (ourStackObject) {
          var index = stackObject.index;
          stackingInfo.splice(Math.max(index - 1, 0), 0, ourStackObject);
        } else {
          logger.warn(
            "[active component] stack object missing at "
              .concat(timelineName, " ")
              .concat(timelineTime)
          );
        }
        _this.setZIndicesForStackingInfo(
          bytecode,
          timelineName,
          timelineTime,
          stackingInfo
        );
        done();
      },
      function(err) {
        cb(err, stackingInfo);
      }
    );
  };
  /**
   * @method zMoveToBack
   */
  ActiveComponent.prototype.zMoveToBack = function(
    componentId,
    timelineName,
    timelineTime,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "zMoveToBack",
      this.getRelpath(),
      componentId,
      timelineName,
      timelineTime,
      metadata,
      function(fire) {
        return _this.zMoveToBackActual(
          componentId,
          timelineName,
          timelineTime,
          metadata,
          function(err, stackingInfo) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                forceFlush: true, // Since z-changes are fixed to frame 0, we must force flush to reflect the change at all frames
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.zMoveToBackActual = function(
    componentId,
    timelineName,
    timelineTime,
    metadata,
    cb
  ) {
    var _this = this;
    var stackingInfo;
    return this.performComponentTimelinesWork(
      function(bytecode, mana, timelines, done) {
        stackingInfo = Template.getStackingInfo(
          bytecode,
          mana,
          timelineName,
          timelineTime
        );
        _this.grabStackObjectFromStackingInfo(stackingInfo, componentId);
        stackingInfo.unshift({
          haikuId: componentId,
          zIndex: 1
        });
        _this.setZIndicesForStackingInfo(
          bytecode,
          timelineName,
          timelineTime,
          stackingInfo
        );
        done();
      },
      function(err) {
        cb(err, stackingInfo);
      }
    );
  };
  /**
   * @method createTimeline
   */
  ActiveComponent.prototype.createTimeline = function(
    timelineName,
    timelineDescriptorSerial,
    metadata,
    cb
  ) {
    var _this = this;
    var timelineDescriptor = Bytecode.unserializeValue(
      timelineDescriptorSerial,
      function(ref) {
        return _this.evaluateReference(ref);
      }
    );
    return this.project.updateHook(
      "createTimeline",
      this.getRelpath(),
      timelineName,
      Bytecode.serializeValue(timelineDescriptor),
      metadata,
      function(fire) {
        return _this.createTimelineActual(
          timelineName,
          timelineDescriptor,
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.createTimelineActual = function(
    timelineName,
    timelineDescriptor,
    metadata,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.createTimeline(bytecode, timelineName, timelineDescriptor);
      done();
    }, cb);
  };
  /**
   * @method renameTimeline
   */
  ActiveComponent.prototype.renameTimeline = function(
    timelineNameOld,
    timelineNameNew,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "renameTimeline",
      this.getRelpath(),
      timelineNameOld,
      timelineNameNew,
      metadata,
      function(fire) {
        return _this.renameTimelineActual(
          timelineNameOld,
          timelineNameNew,
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.renameTimelineActual = function(
    timelineNameOld,
    timelineNameNew,
    metadata,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.renameTimeline(bytecode, timelineNameOld, timelineNameNew);
      done();
    }, cb);
  };
  /**
   * @method deleteTimeline
   */
  ActiveComponent.prototype.deleteTimeline = function(
    timelineName,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "deleteTimeline",
      this.getRelpath(),
      timelineName,
      metadata,
      function(fire) {
        return _this.deleteTimelineActual(timelineName, metadata, function(
          err
        ) {
          if (err) {
            logger.error(
              "[active component (".concat(_this.project.getAlias(), ")]"),
              err
            );
            return cb(err);
          }
          return _this.reload(
            {
              hardReload: _this.project.isRemoteRequest(metadata),
              clearCacheOptions: {
                doClearEntityCaches: true
              }
            },
            null,
            function() {
              fire();
              return cb();
            }
          );
        });
      }
    );
  };
  ActiveComponent.prototype.deleteTimelineActual = function(
    timelineName,
    metadata,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.deleteTimeline(bytecode, timelineName);
      done();
    }, cb);
  };
  /**
   * @method duplicateTimeline
   */
  ActiveComponent.prototype.duplicateTimeline = function(
    timelineName,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "duplicateTimeline",
      this.getRelpath(),
      timelineName,
      metadata,
      function(fire) {
        return _this.duplicateTimelineActual(timelineName, metadata, function(
          err
        ) {
          if (err) {
            logger.error(
              "[active component (".concat(_this.project.getAlias(), ")]"),
              err
            );
            return cb(err);
          }
          return _this.reload(
            {
              hardReload: _this.project.isRemoteRequest(metadata),
              clearCacheOptions: {
                doClearEntityCaches: true
              }
            },
            null,
            function() {
              fire();
              return cb();
            }
          );
        });
      }
    );
  };
  ActiveComponent.prototype.duplicateTimelineActual = function(
    timelineName,
    metadata,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.duplicateTimeline(bytecode, timelineName);
      done();
    }, cb);
  };
  /**
   * @method changePlaybackSpeed
   */
  ActiveComponent.prototype.changePlaybackSpeed = function(
    framesPerSecond,
    metadata,
    cb
  ) {
    var _this = this;
    return this.project.updateHook(
      "changePlaybackSpeed",
      this.getRelpath(),
      framesPerSecond,
      metadata,
      function(fire) {
        return _this.changePlaybackSpeedActual(
          framesPerSecond,
          metadata,
          function(err) {
            if (err) {
              logger.error(
                "[active component (".concat(_this.project.getAlias(), ")]"),
                err
              );
              return cb(err);
            }
            return _this.reload(
              {
                hardReload: _this.project.isRemoteRequest(metadata),
                clearCacheOptions: {
                  doClearEntityCaches: true
                }
              },
              null,
              function() {
                fire();
                return cb();
              }
            );
          }
        );
      }
    );
  };
  ActiveComponent.prototype.changePlaybackSpeedActual = function(
    framesPerSecond,
    metadata,
    cb
  ) {
    return this.performComponentWork(function(bytecode, mana, done) {
      Bytecode.changePlaybackSpeed(bytecode, framesPerSecond);
      done();
    }, cb);
  };
  /**
   * @method getNormalizedBytecodeSHA
   * @description Return a SHA256 for the current in-mem bytecode.
   */
  ActiveComponent.prototype.getNormalizedBytecodeSHA = function() {
    return CryptoUtils.sha256(this.getNormalizedBytecodeJSON());
  };
  ActiveComponent.prototype.getNormalizedBytecode = function() {
    return AST.normalizeBytecode(this.getReifiedBytecode());
  };
  ActiveComponent.prototype.getNormalizedBytecodeJSON = function() {
    return jss(this.getNormalizedBytecode());
  };
  /**
   * @method dump
   * @description Use this to log a concise shorthand of this entity.
   */
  ActiveComponent.prototype.dump = function() {
    var relpath = this.getRelpath();
    var aid = this.getArtboard().getElementHaikuId();
    return ""
      .concat(relpath, "(")
      .concat(this.getMount().getRenderId(), ")@")
      .concat(aid, "/")
      .concat(this.interactionMode);
  };
  // Check sustained warnings (eg identifier not found on expression)
  ActiveComponent.prototype.checkSustainedWarnings = function() {
    this.sustainedWarningsChecker.checkAndGetAllSustainedWarnings();
  };
  ActiveComponent.prototype.syncCode = function(
    currentEditorContents,
    metadata,
    cb
  ) {
    var _this = this;
    var absPath = this.fetchActiveBytecodeFile().getAbspath();
    return Lock.request(Lock.LOCKS.FileReadWrite(absPath), false, function(
      release
    ) {
      return _this.project.updateHook(
        "syncCode",
        _this.getRelpath(),
        currentEditorContents,
        metadata,
        function(fire) {
          try {
            var bytecode = ModuleWrapper.testLoadBytecode(
              currentEditorContents,
              absPath
            );
            _this
              .fetchActiveBytecodeFile()
              .updateContents(currentEditorContents);
            _this.handleUpdatedBytecode(bytecode);
          } catch (requireError) {
            release();
            // If we cannot validate it, return an error.
            return cb(requireError);
          }
          release();
          fire();
          return _this.moduleSync(cb);
        }
      );
    });
  };
  return ActiveComponent;
})(BaseModel);
ActiveComponent.DEFAULT_OPTIONS = {
  required: {
    uid: true,
    file: true,
    project: true,
    relpath: true,
    scenename: true
  }
};
BaseModel.extend(ActiveComponent);
ActiveComponent.buildPrimaryKey = function(folder, scenename) {
  // This replace is a workaround on Windows port to fix that svg fill='url()' cannot
  // understand an URI with backslashes ( rfc2396.txt also states that
  // shouldn't exist backslash on URI ), which is a given by Windows folder path
  //
  // The ideal solution would be use something else to buildPrimaryKey such as
  // organizationName + projectName + scenename
  return folder.replace(/\\/g, "/") + "::" + scenename;
};
/**
 * Used in multi-component scenarios to avoid interop issues when switching context
 * dealing between multiple component instances that share the same bytecode.
 */
ActiveComponent.memorySafeBytecode = function(bytecode, instance) {
  var safe = {};
  for (var key in bytecode) {
    if (key === "template") {
      // The hot template contains references like __memory.targets which get stripped out here
      safe[key] = clone(bytecode[key], instance);
    } else {
      // The other fields should be static as far as rendering is concerned, so no need to clone
      safe[key] = bytecode[key];
    }
  }
  return safe;
};
module.exports = ActiveComponent;
// Down here to avoid Node circular dependency stub objects. #FIXME
var Artboard = require("./Artboard");
var Asset = require("./Asset");
var AST = require("./AST");
var Bytecode = require("./Bytecode");
var Element = require("./Element");
var ElementSelectionProxy = require("./ElementSelectionProxy");
var File = require("./File");
var ImageComponent = require("./ImageComponent");
var InstalledComponent = require("./InstalledComponent");
var Keyframe = require("./Keyframe");
var ModuleWrapper = require("./ModuleWrapper");
var MountElement = require("./MountElement");
var PseudoFile = require("./PseudoFile");
var Row = require("./Row");
var SelectionMarquee = require("./SelectionMarquee");
var Template = require("./Template");
var Timeline = require("./Timeline");
var TimelineProperty = require("./TimelineProperty");
var Property = require("./Property");
//# sourceMappingURL=ActiveComponent.js.map
