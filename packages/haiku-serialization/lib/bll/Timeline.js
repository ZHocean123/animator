var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var numeral = require('numeral');
var TimelineProperty = require('haiku-serialization/src/bll/TimelineProperty');
var BaseModel = require('./BaseModel');
var MathUtils = require('./MathUtils');
var formatSeconds = require('haiku-ui-common/lib/helpers/formatSeconds').default;
var logger = require('haiku-serialization/src/utils/LoggerInstance');
var DURATION_DRAG_INCREASE = 20; // Increase by this much per each duration increase
var DURATION_DRAG_TIMEOUT = 300; // Wait this long before increasing the duration
var DURATION_MOD_TIMEOUT = 100;
var MINIMUM_ZOOM_THRESHOLD = 3; // Minimum number of frames to show
/**
 * @class Timeline
 * @description
 *  Representation of a Timeline of a component.
 *  Provides a convenient way to manage the internals of a timeline without
 *  being concerned with React and all the spaghetti therein.
 *
 *  Allows you to manage:
 *    - Playback settings and state
 *    - Range of frames shown in the Timeline UI, zoom factor, etc.
 *    - Receiving updates to the current time
 *    - Querying for info about the state of the current frame, based on
 *      parameters related to the current zoom factor, offset, etc.
 */
var Timeline = /** @class */ (function (_super) {
    __extends(Timeline, _super);
    function Timeline(props, opts) {
        var _this = _super.call(this, props, opts) || this;
        _this._playing = false;
        _this._isLooping = true;
        _this._stopwatch = Date.now();
        _this._currentFrame = 0;
        _this._fps = 60;
        _this._lastAuthoritativeFrame = 0;
        _this._lastSeek = null;
        _this._visibleFrameRange = [0, 60];
        _this._timelinePixelWidth = 870;
        _this._propertiesPixelWidth = 300;
        _this._maxFrame = _this._visibleFrameRange[1] * 2;
        _this._durationDragStart = 0;
        _this._durationTrim = 0;
        _this._dragIsAdding = false;
        _this._durationInterval = null;
        _this._scrollerLeftDragStart = 0;
        _this._scrollerRightDragStart = 0;
        _this._scrollerBodyDragStart = 0;
        _this._scrollbarStart = 0;
        _this._scrollbarEnd = 0;
        _this._hoveredFrame = 0;
        _this._timeDisplayMode = Timeline.TIME_DISPLAY_MODE.FRAMES;
        _this._scrollLeft = 0;
        _this.raf = null; // Store raf so it can be cancelled
        _this.update = _this.update.bind(_this);
        _this.update();
        return _this;
    }
    Timeline.prototype.rehydrate = function () {
        this.component.rehydrate();
        return this;
    };
    Timeline.prototype.getName = function () {
        return this.name;
    };
    Timeline.prototype.isPlaying = function () {
        return this._playing;
    };
    Timeline.prototype.setRepeat = function (bool) {
        this._isLooping = bool;
    };
    Timeline.prototype.getRepeat = function () {
        return Boolean(this._isLooping);
    };
    Timeline.prototype.getTimeDisplayMode = function () {
        return this._timeDisplayMode;
    };
    Timeline.prototype.setTimeDisplayMode = function (newMode) {
        this._timeDisplayMode = newMode;
        this.emit('update', 'time-display-mode-change');
    };
    Timeline.prototype.toggleTimeDisplayMode = function () {
        if (this.getTimeDisplayMode() === Timeline.TIME_DISPLAY_MODE.FRAMES) {
            this._timeDisplayMode = Timeline.TIME_DISPLAY_MODE.SECONDS;
        }
        else {
            this._timeDisplayMode = Timeline.TIME_DISPLAY_MODE.FRAMES;
        }
        this.emit('update', 'time-display-mode-change');
    };
    Timeline.prototype.getDisplayTime = function () {
        var displayTime = this.getTimeDisplayMode() === Timeline.TIME_DISPLAY_MODE.FRAMES
            ? ~~this.getCurrentFrame()
            : formatSeconds(this.getCurrentFrame() * 1000 / this.getFPS() / 1000).replace('0.', '.');
        return displayTime;
    };
    Timeline.prototype.toggleRepeat = function () {
        this.setRepeat(!this.getRepeat());
    };
    Timeline.prototype.setAuthoritativeFrame = function (authoritativeFrame) {
        this._lastAuthoritativeFrame = authoritativeFrame;
        this._stopwatch = Date.now();
        this.updateCurrentFrame(authoritativeFrame);
    };
    Timeline.prototype.getExtrapolatedCurrentFrame = function () {
        var lap = Date.now();
        var spanMs = lap - this._stopwatch;
        var spanS = spanMs / 1000;
        var spanFrames = Math.round(spanS * this._fps);
        var extrapolatedFrame = this._lastAuthoritativeFrame + spanFrames;
        return extrapolatedFrame;
    };
    Timeline.prototype.togglePlayback = function () {
        var frameInfo = this.getFrameInfo();
        if (this.getCurrentFrame() >= frameInfo.maxf) {
            this.seek(frameInfo.fri0); // Don't pause here because we'll pause below
            this.updateCurrentFrame(frameInfo.fri0);
            this.tryToLeftAlignTickerInVisibleFrameRange(frameInfo.fri0);
        }
        if (this.isPlaying()) {
            this.pause();
        }
        else {
            this.play();
        }
    };
    Timeline.prototype.playbackSkipBack = function () {
        var frameInfo = this.getFrameInfo();
        this.seekAndPause(frameInfo.fri0);
        this.updateCurrentFrame(frameInfo.fri0);
        this.tryToLeftAlignTickerInVisibleFrameRange(frameInfo.fri0);
    };
    Timeline.prototype.playbackSkipForward = function () {
        var frameInfo = this.getFrameInfo();
        this.seekAndPause(frameInfo.maxf);
        this.updateCurrentFrame(frameInfo.maxf);
        this.tryToLeftAlignTickerInVisibleFrameRange(frameInfo.maxf);
    };
    Timeline.prototype.play = function () {
        var _this = this;
        this._playing = true;
        this._stopwatch = Date.now();
        if (!this.component.project.getEnvoyClient().isInMockMode()) {
            var channel = this.component.project.getEnvoyChannel('timeline');
            // Don't know why, but this can be undefined in some edge case/race
            if (channel) {
                channel.play(this.getPrimaryKey()).then(function () {
                    _this.update();
                });
            }
        }
    };
    Timeline.prototype.pause = function (skipTransmit) {
        var _this = this;
        if (skipTransmit === void 0) { skipTransmit = false; }
        this._playing = false;
        this._lastSeek = null;
        if (!skipTransmit && !this.component.project.getEnvoyClient().isInMockMode()) {
            var channel = this.component.project.getEnvoyChannel('timeline');
            // Don't know why, but this can be undefined in some edge case/race
            if (channel) {
                channel.pause(this.getPrimaryKey()).then(function (finalFrame) {
                    _this.setCurrentFrame(finalFrame);
                    _this.setAuthoritativeFrame(finalFrame);
                    _this.tryToLeftAlignTickerInVisibleFrameRange(finalFrame);
                });
            }
        }
    };
    Timeline.prototype.seekToTime = function (time, skipTransmit, forceSeek) {
        var frameInfo = this.getFrameInfo();
        var frame = Math.round(time / frameInfo.mspf);
        return this.seek(frame, skipTransmit, forceSeek);
    };
    Timeline.prototype.seek = function (newFrame, skipTransmit, forceSeek) {
        // Don't bother with any part of this update if we're already at this frame
        if (forceSeek || this.getCurrentFrame() !== newFrame) {
            this.setCurrentFrame(newFrame);
            var id = this.getPrimaryKey();
            var tuple = id + '|' + newFrame;
            var last = this._lastSeek;
            if (forceSeek || last !== tuple) {
                this._lastSeek = tuple;
                this.setAuthoritativeFrame(newFrame);
                // If we end up calling the handler here, we end up doing this:
                // Glass hears 'didSeek', fires its handler.
                // Which calls draw, which in turn calls component.setTimelineTimeValue.
                // Which in turn calls setCurrentTime, which alls Timeline.seekToTime,
                // which in turn calls seek (this method). Beware!
                if (!skipTransmit && !this.component.project.getEnvoyClient().isInMockMode()) {
                    var timelineChannel = this.component.project.getEnvoyChannel('timeline');
                    // When ActiveComponent is loaded, it calls setTimelineTimeValue() -> seek(),
                    // which may occur before Envoy channels are opened, hence this check.
                    if (timelineChannel) {
                        timelineChannel.seekToFrame(id, newFrame);
                    }
                    else {
                        logger.warn("[timeline] envoy timeline channel not open (seekToFrame ".concat(id, ", ").concat(newFrame, ")"));
                    }
                }
            }
        }
    };
    Timeline.prototype.seekAndPause = function (newFrame) {
        var _this = this;
        this.seek(newFrame, true);
        this.pause(true);
        if (!this.component.project.getEnvoyClient().isInMockMode()) {
            var timelineChannel = this.component.project.getEnvoyChannel('timeline');
            // When ActiveComponent is loaded, it calls setTimelineTimeValue() -> seek(),
            // which may occur before Envoy channels are opened, hence this check.
            if (timelineChannel) {
                timelineChannel.seekToFrameAndPause(this.getPrimaryKey(), newFrame).then(function (finalFrame) {
                    _this.setCurrentFrame(finalFrame);
                    _this.setAuthoritativeFrame(finalFrame);
                    _this.tryToLeftAlignTickerInVisibleFrameRange(finalFrame);
                });
            }
            else {
                logger.warn("[timeline] envoy timeline channel not open (seekToFrameAndPause ".concat(this.getPrimaryKey(), ", ").concat(newFrame, ")"));
            }
        }
    };
    Timeline.prototype.update = function () {
        if (this._playing) {
            var frameInfo = this.getFrameInfo();
            // Prevent pointless looping
            if (frameInfo.maxf < 1) {
                this.seekAndPause(frameInfo.maxf);
                return;
            }
            var extrapolatedFrame = this.getExtrapolatedCurrentFrame();
            this.updateCurrentFrame(extrapolatedFrame);
            // Only go as far as the maximum frame as defined in the bytecode
            if (this.getCurrentFrame() > frameInfo.maxf) {
                // Need to unset this or the next seek will be treated as a a no-op
                this._lastSeek = null;
                if (this.getRepeat()) {
                    this.seek(0);
                    this._stopwatch = Date.now();
                }
                else {
                    this.seekAndPause(frameInfo.maxf);
                }
            }
            this.tryToLeftAlignTickerInVisibleFrameRange(this.getCurrentFrame());
            this.raf = window.requestAnimationFrame(this.update);
        }
    };
    Timeline.prototype.getFPS = function () {
        var instance = this.component.$instance;
        if (!instance) {
            return 60;
        }
        return instance.getClock().getFPS();
    };
    Timeline.prototype.getMaxFrame = function () {
        return this._maxFrame;
    };
    Timeline.prototype.setMaxFrame = function (maxFrame) {
        this._maxFrame = maxFrame;
        this.cache.unset('frameInfo');
        this.emit('update', 'timeline-max-frame-changed');
        return this;
    };
    Timeline.prototype.getCurrentFrame = function () {
        return this._currentFrame;
    };
    Timeline.prototype.getCurrentTime = function () {
        var frameInfo = this.getFrameInfo();
        var frame = this.getCurrentFrame();
        return frame * frameInfo.mspf;
    };
    Timeline.prototype.hoverFrame = function (hoveredFrame) {
        this._hoveredFrame = hoveredFrame;
        this.emit('update', 'timeline-frame-hovered');
        return this;
    };
    Timeline.prototype.getHoveredFrame = function () {
        return this._hoveredFrame;
    };
    Timeline.prototype.getCurrentMs = function () {
        var frameInfo = this.getFrameInfo();
        return Math.round(this.getCurrentFrame() * frameInfo.mspf);
    };
    Timeline.prototype.setCurrentFrame = function (currentFrame) {
        this._currentFrame = currentFrame;
        return this;
    };
    Timeline.prototype.updateCurrentFrame = function (currentFrame) {
        this.setCurrentFrame(currentFrame);
        var frameInfo = this.getFrameInfo();
        var timelineTime = Math.round(frameInfo.mspf * this._currentFrame);
        var timelineName = this.component.getCurrentTimelineName();
        this.component.$instance.controlTime(timelineName, timelineTime);
        this.emit('update', 'timeline-frame');
        return this;
    };
    Timeline.prototype.getDurationDragStart = function () {
        return this._durationDragStart;
    };
    Timeline.prototype.getDurationTrim = function () {
        return this._durationTrim;
    };
    Timeline.prototype.setDurationTrim = function (durationTrim) {
        this._durationTrim = durationTrim;
        this.emit('update', 'timeline-duration-trim');
        return this;
    };
    Timeline.prototype.getTimelinePixelWidth = function () {
        return this._timelinePixelWidth;
    };
    Timeline.prototype.setTimelinePixelWidth = function (pxWidth) {
        this._timelinePixelWidth = pxWidth;
        this.cache.unset('frameInfo');
        this.emit('update', 'timeline-timeline-pixel-width');
        return this;
    };
    Timeline.prototype.setPropertiesPixelWidth = function (value) {
        this._propertiesPixelWidth = value;
        this.cache.unset('frameInfo');
    };
    Timeline.prototype.getPropertiesPixelWidth = function () {
        return this._propertiesPixelWidth;
    };
    Timeline.prototype.getVisibleFrameRangeLength = function () {
        return this.getRightFrameEndpoint() - this.getLeftFrameEndpoint();
    };
    Timeline.prototype.getVisibleFrameRange = function () {
        return this._visibleFrameRange;
    };
    Timeline.prototype.getLeftFrameEndpoint = function () {
        return this._visibleFrameRange[0];
    };
    Timeline.prototype.getRightFrameEndpoint = function () {
        return this._visibleFrameRange[1];
    };
    Timeline.prototype.getDragIsAdding = function () {
        return this._dragIsAdding;
    };
    Timeline.prototype.getSelectedKeyframes = function () {
        return Keyframe.filter(function (keyframe) {
            return keyframe.isSelected();
        });
    };
    Timeline.prototype.hasMultipleSelectedKeyframes = function () {
        var found = this.getSelectedKeyframes();
        return found.length > 1;
    };
    /**
     * // Sorry: These should have been given human-readable names
     * <GAUGE>
     *         <----friW--->
     * fri0    friA        friB        friMax
     * |       |           |           |
     * | | | | | | | | | | | | | | | | |
     *         <-----------> << timelines viewport
     * <------->           | << properties viewport
     *         pxA         pxB
     *                                 |pxMax
     * <SCROLLBAR>
     * |-------------------| << scroller viewport
     *     *====*            << scrollbar
     * <------------------->
     * |sc0                |scL && scRatio
     *     |scA
     *          |scB
     */
    Timeline.prototype.getFrameInfo = function () {
        var _this = this;
        return this.cache.fetch('frameInfo', function () {
            var frameInfo = {};
            // Number of frames per second
            frameInfo.fps = _this.getFPS();
            // Milliseconds per frame
            frameInfo.mspf = 1000 / frameInfo.fps;
            // The maximum milliseconds *as defined in the bytecode*
            // and *including timeline keyframes and frame linsteners*
            frameInfo.maxms = _this.component.$instance.getTimeline(_this.component.getCurrentTimelineName()).getMaxTime();
            // The maximum frame *as defined in the bytecode*
            frameInfo.maxf = Timeline.millisecondToNearestFrame(frameInfo.maxms, frameInfo.mspf); // Maximum frame defined in the timeline
            // The lowest possible frame (always 0) (this is pointless but?)
            frameInfo.fri0 = 0;
            // The leftmost frame on the visible range
            frameInfo.friA = (_this.getLeftFrameEndpoint() < frameInfo.fri0)
                ? frameInfo.fri0
                : _this.getLeftFrameEndpoint();
            // The maximum frame that can be reached via scrolling on the timeline
            // If the defined frame is too small, use our own virtual maximum
            frameInfo.friMax = (frameInfo.maxf < _this.getMaxFrame())
                ? _this.getMaxFrame()
                : frameInfo.maxf;
            // Whichever max is higher: the virtual, or the assigned value
            frameInfo.friMaxVirt = _this.getMaxFrame();
            // The rightmost frame on the visible range
            frameInfo.friB = (_this.getRightFrameEndpoint() > frameInfo.friMaxVirt)
                ? frameInfo.friMaxVirt
                : _this.getRightFrameEndpoint();
            frameInfo.pxpf = _this._timelinePixelWidth / Math.abs(_this.getRightFrameEndpoint() - _this.getLeftFrameEndpoint());
            // Pixel number for friA, the leftmost frame on the visible range
            frameInfo.pxA = frameInfo.friA * frameInfo.pxpf;
            // Pixel number for friB, the rightmost frame on the visible range
            frameInfo.pxB = frameInfo.friB * frameInfo.pxpf;
            // Pixel number for friMax2, i.e. the width in pixels of the whole timeline
            frameInfo.pxMax = frameInfo.friMax * frameInfo.pxpf;
            // Millisecond number for friA, the leftmost frame in the visible range
            frameInfo.msA = Math.round(frameInfo.friA * frameInfo.mspf);
            // Millisecond number for friB, the rightmost frame in the visible range
            frameInfo.msB = Math.round(frameInfo.friB * frameInfo.mspf);
            // The length in pixels of the scroller view
            frameInfo.scL = _this._propertiesPixelWidth + _this._timelinePixelWidth;
            // The ratio of the scroller view to the timeline view (so the scroller renders in proportion)
            frameInfo.scRatio = frameInfo.pxMax / frameInfo.scL;
            // The pixel of the left endpoint of the scroller
            frameInfo.scA = (frameInfo.pxA) / frameInfo.scRatio;
            // The pixel of the right endpoint of the scroller
            frameInfo.scB = (frameInfo.pxB) / frameInfo.scRatio;
            return frameInfo;
        });
    };
    Timeline.prototype.getVisibleFrames = function () {
        var visibleFrames = [];
        var frameInfo = this.getFrameInfo();
        var leftFrame = 0;
        var rightFrame = frameInfo.friMax;
        var leftMostAbsolutePixel = Math.round(leftFrame * frameInfo.pxpf);
        var frameModulus = Timeline.getFrameModulus(frameInfo.pxpf);
        for (var i = leftFrame; i <= rightFrame; i++) {
            var pixelOffsetLeft = Math.round(i * frameInfo.pxpf);
            visibleFrames.push({
                pixelOffsetLeft: pixelOffsetLeft,
                frameModulus: frameModulus,
                frameNumber: i,
                leftMostAbsolutePixel: leftMostAbsolutePixel,
                pixelsPerFrame: frameInfo.pxpf,
            });
        }
        return visibleFrames;
    };
    Timeline.prototype.mapVisibleFrames = function (iteratee) {
        var mappedOutput = [];
        var visibleFrames = this.getVisibleFrames();
        visibleFrames.forEach(function (_a) {
            var pixelOffsetLeft = _a.pixelOffsetLeft, leftMostAbsolutePixel = _a.leftMostAbsolutePixel, frameModulus = _a.frameModulus, frameNumber = _a.frameNumber, pixelsPerFrame = _a.pixelsPerFrame;
            var mapOutput = iteratee(frameNumber, pixelOffsetLeft - leftMostAbsolutePixel, pixelsPerFrame, frameModulus);
            if (mapOutput) {
                mappedOutput.push(mapOutput);
            }
        });
        return mappedOutput;
    };
    Timeline.prototype.mapVisibleTimes = function (iteratee) {
        var mappedOutput = [];
        var frameInfo = this.getFrameInfo();
        var leftFrame = frameInfo.friA;
        var leftMs = 0;
        var rightMs = frameInfo.friMax * frameInfo.mspf;
        var totalMs = rightMs - leftMs;
        var msModulus = Timeline.getMillisecondModulus(frameInfo.pxpf);
        var firstMarker = MathUtils.roundUp(leftMs, msModulus);
        var msMarkerTmp = firstMarker;
        var msMarkers = [];
        while (msMarkerTmp <= rightMs) {
            msMarkers.push(msMarkerTmp);
            msMarkerTmp += msModulus;
        }
        for (var i = 0; i < msMarkers.length; i++) {
            var msMarker = msMarkers[i];
            var nearestFrame = Timeline.millisecondToNearestFrame(msMarker, frameInfo.mspf);
            var msRemainder = Math.floor(nearestFrame * frameInfo.mspf - msMarker);
            // TODO: handle the msRemainder case rather than ignoring it
            if (!msRemainder) {
                var frameOffset = nearestFrame - leftFrame;
                var pxOffset = Math.round(frameOffset * frameInfo.pxpf);
                var mapOutput = iteratee(msMarker, pxOffset, totalMs);
                if (mapOutput) {
                    mappedOutput.push(mapOutput);
                }
            }
        }
        return mappedOutput;
    };
    Timeline.prototype.dragDurationModifierPosition = function (dragX) {
        var _this = this;
        var frameInfo = this.getFrameInfo();
        var dragStart = this.getDurationDragStart();
        var dragDelta = dragX - dragStart;
        var frameDelta = Math.round(dragDelta / frameInfo.pxpf);
        if (dragDelta > 0 && this.getDurationTrim() >= 0) {
            if (!this._durationInterval) {
                // The point of this interval is to let the user hold the little element over to the
                // side for a bit before we immediately start adding frames (don't do it right away)
                this._durationInterval = setInterval(function () {
                    var currentMax = (_this.getMaxFrame())
                        ? _this.getMaxFrame()
                        : frameInfo.friMax2;
                    _this.setMaxFrame(currentMax + DURATION_DRAG_INCREASE);
                }, DURATION_DRAG_TIMEOUT);
            }
            this._dragIsAdding = true;
            return;
        }
        if (this._durationInterval) {
            clearInterval(this._durationInterval);
        }
        // Don't let user drag back past last frame; and don't let them drag more than an entire width of frames
        if (frameInfo.friB + frameDelta <= frameInfo.friMax || -frameDelta >= frameInfo.friB - frameInfo.friA) {
            // TODO: make more precise so it removes as many frames as
            // it can instead of completely ignoring the drag
            frameDelta = this.getDurationTrim();
            return;
        }
        this._dragIsAdding = false;
        this.setDurationTrim(frameDelta);
    };
    Timeline.prototype.handleDurationModifierStop = function () {
        var _this = this;
        var frameInfo = this.getFrameInfo();
        var currentMax = this.getMaxFrame() ? this.getMaxFrame() : frameInfo.friMax2;
        clearInterval(this._durationInterval);
        this.setMaxFrame(currentMax + this._durationTrim);
        this._dragIsAdding = false;
        this._durationInterval = null;
        setTimeout(function () {
            _this._durationDragStart = null;
            _this._durationTrim = 0;
        }, DURATION_MOD_TIMEOUT);
    };
    Timeline.prototype.calculateMaxScrollValue = function () {
        return this.calculateFullTimelineWidth() - this._timelinePixelWidth;
    };
    Timeline.prototype.handleSettingScroll = function (scrollValue, eventName) {
        if (scrollValue >= 0) {
            var maxScrollValue = this.calculateMaxScrollValue();
            var frameInfo = this.getFrameInfo();
            if (scrollValue >= maxScrollValue) {
                var pixelsToMove = 40;
                var framesToMove = pixelsToMove / frameInfo.pxpf;
                this._scrollLeft = maxScrollValue;
                this.setMaxFrame(this.getMaxFrame() + framesToMove);
            }
            else {
                var left = Math.round(scrollValue / frameInfo.pxpf);
                var right = left + this._visibleFrameRange[1] - this._visibleFrameRange[0];
                this.setVisibleFrameRange(left, right, false);
                this._scrollLeft = scrollValue;
            }
            this.emit('update', eventName);
        }
    };
    Timeline.prototype.setScrollLeft = function (scrollValue) {
        this.handleSettingScroll(scrollValue, 'timeline-scroll');
    };
    Timeline.prototype.setScrollLeftFromScrollbar = function (scrollValue) {
        this.handleSettingScroll(scrollValue, 'timeline-scroll-from-scrollbar');
    };
    Timeline.prototype.getScrollLeft = function () {
        return this._scrollLeft;
    };
    Timeline.prototype.mapXCoordToFrame = function (coord) {
        var frameInfo = this.getFrameInfo();
        return Math.round((coord / frameInfo.pxpf) * frameInfo.scRatio);
    };
    Timeline.prototype.zoomBy = function (scale) {
        var left = this.getLeftFrameEndpoint();
        var right = this.getRightFrameEndpoint();
        this.zoomByLeftAndRightEndpoints((left * scale) + left, (right * scale) + right);
    };
    Timeline.prototype.zoomByLeftAndRightEndpoints = function (left, right, fromScrollbar) {
        if (fromScrollbar === void 0) { fromScrollbar = false; }
        var leftTotal = left || this.getLeftFrameEndpoint();
        var rightTotal = right || this.getRightFrameEndpoint();
        var difference = rightTotal - leftTotal;
        var frameInfo = this.getFrameInfo();
        if (difference < MINIMUM_ZOOM_THRESHOLD ||
            difference > this._timelinePixelWidth * 2 ||
            rightTotal < leftTotal) {
            return;
        }
        if (leftTotal < frameInfo.fri0) {
            leftTotal = frameInfo.fri0;
        }
        this.setVisibleFrameRange(leftTotal, rightTotal);
        if (fromScrollbar) {
            var scrollValue = leftTotal * frameInfo.pxpf;
            this.setScrollLeftFromScrollbar(scrollValue);
        }
    };
    Timeline.prototype.updateVisibleFrameRangeByDelta = function (delta) {
        var l = this.getLeftFrameEndpoint() + delta;
        var r = this.getRightFrameEndpoint() + delta;
        if (l >= 0) {
            this.setVisibleFrameRange(l, r);
        }
    };
    /**
     * @method tryToLeftAlignTickerInVisibleFrameRange
     * @description will left-align the current timeline window (maintaining zoom)
     */
    Timeline.prototype.tryToLeftAlignTickerInVisibleFrameRange = function (frame) {
        var frameInfo = this.getFrameInfo();
        var pxOffsetLeft = frame * frameInfo.pxpf;
        if (frame !== undefined && (pxOffsetLeft > this._scrollLeft + this._timelinePixelWidth || pxOffsetLeft < this._scrollLeft)) {
            this.setScrollLeftFromScrollbar(pxOffsetLeft);
        }
        return this;
    };
    Timeline.prototype.setVisibleFrameRange = function (l, r, shouldNotifyUpdates) {
        if (shouldNotifyUpdates === void 0) { shouldNotifyUpdates = true; }
        this._visibleFrameRange = [l, r];
        if (r > this.getMaxFrame()) {
            this.setMaxFrame(r);
        }
        this.cache.unset('frameInfo');
        if (shouldNotifyUpdates) {
            Keyframe.clearAllViewPositions({ component: this.component });
            this.emit('update', 'timeline-frame-range');
        }
        return this;
    };
    Timeline.prototype.calculateFullTimelineWidth = function () {
        var frameInfo = this.getFrameInfo();
        return frameInfo.pxMax + 20;
    };
    Timeline.prototype.updateScrubberPositionByDelta = function (delta) {
        var currentFrame = this.getCurrentFrame() + delta;
        if (currentFrame <= 0) {
            currentFrame = 0;
        }
        this.component.getCurrentTimeline().seek(currentFrame);
    };
    Timeline.prototype.normalizeMs = function (ms) {
        var frameInfo = this.getFrameInfo();
        var nearestFrame = Timeline.millisecondToNearestFrame(ms, frameInfo.mspf);
        var finalMs = Math.round(nearestFrame * frameInfo.mspf);
        return finalMs;
    };
    Timeline.prototype.notifyFrameActionChange = function () {
        this.emit('update', 'timeline-frame-action');
    };
    return Timeline;
}(BaseModel));
Timeline.DEFAULT_OPTIONS = {
    required: {
        component: true,
        name: true,
    },
};
BaseModel.extend(Timeline);
Timeline.eachTimelineKeyframeDescriptor = function eachTimelineKeyframeDescriptor(timelines, iteratee) {
    for (var timelineName in timelines) {
        for (var componentSelector in timelines[timelineName]) {
            for (var propertyName in timelines[timelineName][componentSelector]) {
                for (var keyframeMs in timelines[timelineName][componentSelector][propertyName]) {
                    iteratee(timelines[timelineName][componentSelector][propertyName][keyframeMs], keyframeMs, propertyName, componentSelector, timelineName);
                }
            }
        }
    }
};
Timeline.getFrameModulus = function (pxpf) {
    if (pxpf >= 20) {
        return 1;
    }
    if (pxpf >= 15) {
        return 2;
    }
    if (pxpf >= 10) {
        return 5;
    }
    if (pxpf >= 5) {
        return 10;
    }
    if (pxpf === 4) {
        return 15;
    }
    if (pxpf === 3) {
        return 20;
    }
    if (pxpf === 2) {
        return 30;
    }
    return 50;
};
Timeline.getMillisecondModulus = function (pxpf) {
    if (pxpf >= 20) {
        return 25;
    }
    if (pxpf >= 15) {
        return 50;
    }
    if (pxpf >= 10) {
        return 100;
    }
    if (pxpf >= 5) {
        return 200;
    }
    if (pxpf >= 4) {
        return 250;
    }
    if (pxpf >= 3) {
        return 500;
    }
    if (pxpf >= 2) {
        return 1000;
    }
    return 5000;
};
Timeline.millisecondToNearestFrame = function millisecondToNearestFrame(msValue, mspf) {
    return Math.round(msValue / mspf);
};
Timeline.UNIT_MAPPING = {
    'translation.x': 'px',
    'translation.y': 'px',
    'translation.z': 'px',
    'rotation.z': 'rad',
    'rotation.y': 'rad',
    'rotation.x': 'rad',
    'scale.x': '',
    'scale.y': '',
    opacity: '',
    shown: '',
    backgroundColor: '',
    color: '',
    fill: '',
    stroke: '',
};
Timeline.inferUnitOfValue = function inferUnitOfValue(propertyName) {
    var unit = Timeline.UNIT_MAPPING[propertyName];
    if (unit) {
        return unit;
    }
    return '';
};
Timeline.getPropertyValueDescriptor = function getPropertyValueDescriptor(timelineRow, options) {
    var componentId = timelineRow.element.getComponentId();
    var elementName = timelineRow.element.getNameString();
    var propertyName = timelineRow.getPropertyNameString();
    var hostInstance = timelineRow.component.$instance;
    var hostStates = (hostInstance && hostInstance.getStates()) || {};
    var bytecodeFile = timelineRow.component.fetchActiveBytecodeFile();
    var serializedBytecode = bytecodeFile.getSerializedBytecode();
    var reifiedBytecode = bytecodeFile.getReifiedBytecode();
    var currentTimelineName = (options.timelineName)
        ? options.timelineName
        : timelineRow.component.getCurrentTimelineName();
    var currentTimelineTime = (options.timelineTime !== undefined)
        ? options.timelineTime
        : timelineRow.component.getCurrentTimelineTime();
    var propertyDescriptor = timelineRow.getDescriptor();
    var fallbackValue = propertyDescriptor.fallback;
    var baselineValue = TimelineProperty.getBaselineValue(componentId, elementName, propertyName, currentTimelineName, currentTimelineTime, fallbackValue, reifiedBytecode, hostInstance, hostStates);
    var baselineCurve = TimelineProperty.getBaselineCurve(componentId, elementName, propertyName, currentTimelineName, currentTimelineTime, fallbackValue, reifiedBytecode, hostInstance, hostStates);
    var computedValue = TimelineProperty.getComputedValue(componentId, elementName, propertyName, currentTimelineName, currentTimelineTime, fallbackValue, reifiedBytecode, hostInstance, hostStates);
    var assignedValueObject = TimelineProperty.getAssignedValueObject(componentId, elementName, propertyName, currentTimelineName, currentTimelineTime, serializedBytecode);
    var assignedValue = assignedValueObject && assignedValueObject.value;
    var bookendValueObject = TimelineProperty.getAssignedBaselineValueObject(componentId, elementName, propertyName, currentTimelineName, currentTimelineTime, serializedBytecode);
    var bookendValue = bookendValueObject && bookendValueObject.value;
    var prettyValue;
    if (assignedValue !== undefined) {
        if (assignedValue && typeof assignedValue === 'object' && assignedValue.__function) {
            var cleanValue = Expression.retToEq(assignedValue.__function.body.trim());
            if (cleanValue.length > 6) {
                cleanValue = (cleanValue.slice(0, 6) + '…');
            }
            prettyValue = { text: cleanValue, style: { whiteSpace: 'nowrap' }, render: 'react' };
        }
    }
    if (prettyValue === undefined) {
        if (assignedValue === undefined && bookendValue !== undefined) {
            if (bookendValue && typeof bookendValue === 'object' && bookendValue.__function) {
                prettyValue = { text: '⚡', style: { fontSize: '11px' }, render: 'react' };
            }
        }
    }
    if (prettyValue === undefined) {
        var formattedPrettyValue = (typeof computedValue === 'number')
            ? numeral(computedValue || 0).format(options.numFormat || '0,0[.]0')
            : computedValue;
        prettyValue = {
            // TODO: remove this check when https://github.com/adamwdraper/Numeral-js/pull/629 is merged
            text: isNaN(formattedPrettyValue) ? computedValue : formattedPrettyValue,
        };
    }
    var valueUnit = Timeline.inferUnitOfValue(propertyDescriptor.name);
    var valueLabel = Property.humanizePropertyName(propertyName);
    return {
        timelineTime: currentTimelineTime,
        timelineName: currentTimelineName,
        propertyName: propertyName,
        valueUnit: valueUnit,
        valueLabel: valueLabel,
        fallbackValue: fallbackValue,
        baselineValue: baselineValue,
        baselineCurve: baselineCurve,
        computedValue: computedValue,
        assignedValue: assignedValue,
        bookendValue: bookendValue,
        prettyValue: prettyValue,
    };
};
Timeline.DEFAULT_NAME = 'Default';
Timeline.TIME_DISPLAY_MODE = {
    FRAMES: 'frames',
    SECONDS: 'seconds',
};
module.exports = Timeline;
// Down here to avoid Node circular dependency stub objects. #FIXME
var Expression = require('./Expression');
var Keyframe = require('./Keyframe');
var Property = require('./Property');
//# sourceMappingURL=Timeline.js.map