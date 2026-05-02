import {DEFAULT_PAGE_HEIGHT, DEFAULT_PAGE_WIDTH, fitsInPage, resolvePageSize} from '../src/sdk/pageSize';
import type {APIResponse} from '../src/sdk/types';

const ok = <T>(result: T): APIResponse<T> => ({success: true, result});
const fail = <T>(message = 'boom'): APIResponse<T> => ({success: false, error: {code: 1, message}});

const buildDeps = () => {
  const getCurrentFilePath = jest.fn<Promise<APIResponse<string>>, []>(async () => ok('/notes/foo.note'));
  const getCurrentPageNum = jest.fn<Promise<APIResponse<number>>, []>(async () => ok(0));
  const getPageSize = jest.fn<Promise<APIResponse<{width: number; height: number}>>, [string, number]>(async () =>
    ok({width: 1404, height: 1872}),
  );
  return {comm: {getCurrentFilePath, getCurrentPageNum}, fileApi: {getPageSize}};
};

const stubLogger = () => {
  const warns: string[] = [];
  return {warns, logger: {warn: (m: string) => warns.push(m)}};
};

describe('resolvePageSize', () => {
  it('happy path returns width/height from getPageSize', async () => {
    const {comm, fileApi} = buildDeps();
    const size = await resolvePageSize(comm, fileApi);
    expect(size).toEqual({width: 1404, height: 1872});
  });

  it('falls back to defaults when getCurrentFilePath fails', async () => {
    const {comm, fileApi} = buildDeps();
    comm.getCurrentFilePath.mockImplementationOnce(async () => fail('no file'));
    const {warns, logger} = stubLogger();
    const size = await resolvePageSize(comm, fileApi, logger);
    expect(size).toEqual({width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT});
    expect(warns.some(w => w.includes('current file'))).toBe(true);
  });

  it('falls back to defaults when getCurrentPageNum fails', async () => {
    const {comm, fileApi} = buildDeps();
    comm.getCurrentPageNum.mockImplementationOnce(async () => fail('no page'));
    const size = await resolvePageSize(comm, fileApi);
    expect(size).toEqual({width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT});
  });

  it('falls back to defaults when getPageSize fails', async () => {
    const {comm, fileApi} = buildDeps();
    fileApi.getPageSize.mockImplementationOnce(async () => fail('no size'));
    const {warns, logger} = stubLogger();
    const size = await resolvePageSize(comm, fileApi, logger);
    expect(size).toEqual({width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT});
    expect(warns.some(w => w.includes('getPageSize'))).toBe(true);
  });

  it('falls back to defaults when an upstream call throws', async () => {
    const {comm, fileApi} = buildDeps();
    comm.getCurrentFilePath.mockImplementationOnce(async () => {
      throw new Error('crash');
    });
    const {warns, logger} = stubLogger();
    const size = await resolvePageSize(comm, fileApi, logger);
    expect(size).toEqual({width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT});
    expect(warns.some(w => w.includes('threw'))).toBe(true);
  });
});

describe('fitsInPage', () => {
  const page = {width: 1000, height: 2000};

  it('accepts a rect strictly inside the page', () => {
    expect(fitsInPage({left: 10, top: 10, right: 990, bottom: 1990}, page)).toBe(true);
  });

  it('accepts a rect that touches the edges', () => {
    expect(fitsInPage({left: 0, top: 0, right: 1000, bottom: 2000}, page)).toBe(true);
  });

  it('rejects a rect that exits to the left', () => {
    expect(fitsInPage({left: -1, top: 10, right: 100, bottom: 100}, page)).toBe(false);
  });

  it('rejects a rect that exits to the right', () => {
    expect(fitsInPage({left: 10, top: 10, right: 1001, bottom: 100}, page)).toBe(false);
  });

  it('rejects a rect that exits the bottom', () => {
    expect(fitsInPage({left: 10, top: 10, right: 100, bottom: 2001}, page)).toBe(false);
  });
});
