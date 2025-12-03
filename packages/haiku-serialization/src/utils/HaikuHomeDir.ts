import * as os from 'node:os'
import * as path from 'node:path'
import * as fse from 'fs-extra'

/**
 * 项目信息接口
 */
interface ProjectInfo {
  project: string
  abspath: string
}

/**
 * 组织项目映射接口
 */
interface OrganizationProjects {
  [organizationName: string]: ProjectInfo[]
}

/**
 * 异步回调函数类型
 */
type AsyncCallback<T> = (err: Error | null, result?: T) => void

/**
 * Haiku主目录管理模块
 */
class HaikuHomeDir {
  private static didTakeTourCache: boolean | null = null

  public static readonly HOMEDIR_PATH: string = path.join(os.homedir(), '.haiku')
  public static readonly HOMEDIR_AUTH_PATH: string = path.join(HaikuHomeDir.HOMEDIR_PATH, 'auth')
  public static readonly HOMEDIR_PROJECTS_PATH: string = path.join(HaikuHomeDir.HOMEDIR_PATH, 'projects')
  public static readonly HOMEDIR_LOGS_PATH: string = path.join(HaikuHomeDir.HOMEDIR_PATH, 'logs')
  public static readonly HOMEDIR_MODEL_STORAGE_PATH: string = path.join(HaikuHomeDir.HOMEDIR_PATH, 'model-storage')
  public static readonly HOMEDIR_CRASH_REPORTS_PATH: string = path.join(HaikuHomeDir.HOMEDIR_PATH, 'crash-reports')
  public static readonly HOMEDIR_MANIFEST_PATH: string = path.join(HaikuHomeDir.HOMEDIR_PATH, 'manifest.json')
  public static readonly HOMEDIR_TOUR_PATH: string = path.join(HaikuHomeDir.HOMEDIR_PATH, 'tour.json')
  public static readonly HOMEDIR_SKETCH_DIALOG_PATH: string = path.join(HaikuHomeDir.HOMEDIR_PATH, 'sketch-dialog')

  /**
   * 检查用户是否已完成导览，基于HOMEDIR_TOUR_PATH文件的存在
   *
   * @returns {boolean} 如果用户已完成导览则返回true，否则返回false
   */
  public static didTakeTour(): boolean {
    if (HaikuHomeDir.didTakeTourCache === null) {
      HaikuHomeDir.didTakeTourCache = fse.existsSync(HaikuHomeDir.HOMEDIR_TOUR_PATH)
    }

    return HaikuHomeDir.didTakeTourCache
  }

  /**
   * 创建存储导览选项的文件
   */
  public static createTourFile(): void {
    // 即使文件实际上没有被创建（想象在ensureFileSync上出错），
    // 我们仍然想要设置缓存
    HaikuHomeDir.didTakeTourCache = true
    fse.ensureFileSync(HaikuHomeDir.HOMEDIR_TOUR_PATH)
  }

  /**
   * 检查用户是否已询问过草图，基于HOMEDIR_SKETCH_DIALOG_PATH文件的存在
   *
   * @returns {boolean} 如果用户已询问过草图则返回true，否则返回false
   */
  public static didAskedForSketch(): boolean {
    return fse.existsSync(HaikuHomeDir.HOMEDIR_SKETCH_DIALOG_PATH)
  }

  /**
   * 创建存储草图对话框选项的文件
   */
  public static createSketchDialogFile(): void {
    fse.ensureFileSync(HaikuHomeDir.HOMEDIR_SKETCH_DIALOG_PATH)
  }

  /**
   * 检查给定路径是否为目录
   *
   * @param {string} abspath - 要检查的绝对路径
   * @returns {boolean} 如果路径是目录则返回true，否则返回false
   */
  private static isDir(abspath: string): boolean {
    try {
      return fse.lstatSync(abspath).isDirectory()
    }
    catch (exception) {
      import('./LoggerInstance').then(({ default: logger }) => {
        logger.warn(exception)
      })
      return false
    }
  }

  /**
   * 按组织枚举所有项目
   *
   * @param {AsyncCallback<OrganizationProjects>} cb - 完成时调用的回调函数
   * @returns {void}
   */
  public static enumerateAllProjectsByOrganization(cb: AsyncCallback<OrganizationProjects>): void {
    fse.readdir(HaikuHomeDir.HOMEDIR_PROJECTS_PATH, (err: NodeJS.ErrnoException | null, orgEntries: string[]) => {
      if (err) {
        return cb(err)
      }

      const organizations: OrganizationProjects = {}
      let pendingCount = 0
      let hasError = false

      const checkComplete = (): void => {
        if (pendingCount === 0 && !hasError) {
          cb(null, organizations)
        }
      }

      orgEntries.forEach((orgEntry: string) => {
        const orgAbspath = path.join(HaikuHomeDir.HOMEDIR_PROJECTS_PATH, orgEntry)

        // 不包含任何不是目录的组织
        if (!HaikuHomeDir.isDir(orgAbspath)) {
          return
        }
        if (orgEntry[0] === '.') {
          return
        }

        pendingCount++
        organizations[orgEntry] = []

        fse.readdir(orgAbspath, (err: NodeJS.ErrnoException | null, projEntries: string[] | undefined) => {
          pendingCount--

          if (err) {
            if (!hasError) {
              hasError = true
              cb(err)
            }
            return
          }

          if (!projEntries) {
            return checkComplete()
          }

          projEntries.forEach((projEntry: string) => {
            const projAbspath = path.join(orgAbspath, projEntry)

            // 只包含不是备份或奇怪文件的可见目录
            if (!HaikuHomeDir.isDir(projAbspath)) {
              return
            }
            if (projEntry[0] === '.') {
              return
            }
            if (projEntry[0] === '~') {
              return
            }
            if (projEntry.match(/\.bak/)) {
              return
            }

            organizations[orgEntry].push({
              project: projEntry,
              abspath: projAbspath,
            })
          })

          checkComplete()
        })
      })

      // 如果没有任何组织目录，立即返回
      if (pendingCount === 0) {
        cb(null, organizations)
      }
    })
  }
}

// 导出兼容CommonJS的接口
const out = {
  HOMEDIR_PATH: HaikuHomeDir.HOMEDIR_PATH,
  HOMEDIR_AUTH_PATH: HaikuHomeDir.HOMEDIR_AUTH_PATH,
  HOMEDIR_PROJECTS_PATH: HaikuHomeDir.HOMEDIR_PROJECTS_PATH,
  HOMEDIR_LOGS_PATH: HaikuHomeDir.HOMEDIR_LOGS_PATH,
  HOMEDIR_MODEL_STORAGE_PATH: HaikuHomeDir.HOMEDIR_MODEL_STORAGE_PATH,
  HOMEDIR_CRASH_REPORTS_PATH: HaikuHomeDir.HOMEDIR_CRASH_REPORTS_PATH,
  HOMEDIR_MANIFEST_PATH: HaikuHomeDir.HOMEDIR_MANIFEST_PATH,
  HOMEDIR_TOUR_PATH: HaikuHomeDir.HOMEDIR_TOUR_PATH,
  HOMEDIR_SKETCH_DIALOG_PATH: HaikuHomeDir.HOMEDIR_SKETCH_DIALOG_PATH,
  didTakeTour: HaikuHomeDir.didTakeTour,
  createTourFile: HaikuHomeDir.createTourFile,
  didAskedForSketch: HaikuHomeDir.didAskedForSketch,
  createSketchDialogFile: HaikuHomeDir.createSketchDialogFile,
  enumerateAllProjectsByOrganization: HaikuHomeDir.enumerateAllProjectsByOrganization,
}

export default out
export { HaikuHomeDir }
export type {
  AsyncCallback,
  OrganizationProjects,
  ProjectInfo,
}
