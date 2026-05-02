// Resolve the current page size in firmware coords (the same coord
// system used by getLassoRect / resizeLassoRect). Mirrors the
// sn-shapes / sn-mindmap pattern: best-effort lookup with a hard
// fallback to known A5X2 dimensions when any step fails (renamed
// notes, missing API, transient firmware error).

import type {APIResponse, Logger} from './types';

export const DEFAULT_PAGE_WIDTH = 1920;
export const DEFAULT_PAGE_HEIGHT = 2560;

export type PageSize = {width: number; height: number};

export type PageSizeCommAPI = {
  getCurrentFilePath: () => Promise<APIResponse<string>>;
  getCurrentPageNum: () => Promise<APIResponse<number>>;
};

export type PageSizeFileAPI = {
  getPageSize: (notePath: string, page: number) => Promise<APIResponse<PageSize>>;
};

export const resolvePageSize = async (
  comm: PageSizeCommAPI,
  fileApi: PageSizeFileAPI,
  logger?: Pick<Logger, 'warn'>,
): Promise<PageSize> => {
  try {
    const [pathRes, pageRes] = await Promise.all([comm.getCurrentFilePath(), comm.getCurrentPageNum()]);
    if (
      pathRes?.success &&
      pageRes?.success &&
      typeof pathRes.result === 'string' &&
      typeof pageRes.result === 'number'
    ) {
      const sizeRes = await fileApi.getPageSize(pathRes.result, pageRes.result);
      if (
        sizeRes?.success &&
        sizeRes.result &&
        typeof sizeRes.result.width === 'number' &&
        typeof sizeRes.result.height === 'number'
      ) {
        return {width: sizeRes.result.width, height: sizeRes.result.height};
      }
      logger?.warn(`[align:pageSize] getPageSize unsuccessful: ${sizeRes?.error?.message ?? 'unknown'}`);
    } else {
      logger?.warn('[align:pageSize] could not resolve current file or page number');
    }
  } catch (e) {
    logger?.warn(`[align:pageSize] resolve threw: ${(e as Error).message}`);
  }
  return {width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT};
};

export const fitsInPage = (rect: {left: number; top: number; right: number; bottom: number}, page: PageSize): boolean =>
  rect.left >= 0 && rect.top >= 0 && rect.right <= page.width && rect.bottom <= page.height;
