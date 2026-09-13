import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createPageFeedPostMock, createPagePhotoPostMock } = vi.hoisted(() => ({
  createPageFeedPostMock: vi.fn(),
  createPagePhotoPostMock: vi.fn(),
}));

vi.mock('@/lib/facebook/graph', async () => {
  const actual = await vi.importActual<typeof import('@/lib/facebook/graph')>('@/lib/facebook/graph');
  return { ...actual, createPageFeedPost: createPageFeedPostMock, createPagePhotoPost: createPagePhotoPostMock };
});

import { publishFacebookPagePost, UnsupportedPageError } from './publish';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';
import { FacebookGraphError } from '@/lib/facebook/graph';

beforeEach(() => {
  createPageFeedPostMock.mockReset();
  createPagePhotoPostMock.mockReset();
});

describe('publishFacebookPagePost', () => {
  it('rejects a page that is not the configured, supported Facebook Page', async () => {
    await expect(publishFacebookPagePost({ id: '1', pageId: '000000000000000', caption: 'hello', mediaUrls: [] }))
      .rejects.toThrow(UnsupportedPageError);
    expect(createPageFeedPostMock).not.toHaveBeenCalled();
  });

  it('uses the text-only feed endpoint when there is no media', async () => {
    createPageFeedPostMock.mockResolvedValue({ postId: '106658601471856_999' });
    const result = await publishFacebookPagePost({ id: '1', pageId: GP_CAFE_PAGE_ID, caption: 'Come visit us!', mediaUrls: [] });

    expect(createPageFeedPostMock).toHaveBeenCalledWith(GP_CAFE_PAGE_ID, 'Come visit us!');
    expect(createPagePhotoPostMock).not.toHaveBeenCalled();
    expect(result.externalPostId).toBe('106658601471856_999');
    expect(result.externalPermalink).toBe('https://www.facebook.com/106658601471856_999');
  });

  it('uses the photo endpoint when media is provided, with the correct URL and caption', async () => {
    createPagePhotoPostMock.mockResolvedValue({ postId: '106658601471856_888' });
    const result = await publishFacebookPagePost({ id: '1', pageId: GP_CAFE_PAGE_ID, caption: 'New menu item!', mediaUrls: ['https://example.com/dish.jpg'] });

    expect(createPagePhotoPostMock).toHaveBeenCalledWith(GP_CAFE_PAGE_ID, 'https://example.com/dish.jpg', 'New menu item!');
    expect(createPageFeedPostMock).not.toHaveBeenCalled();
    expect(result.externalPostId).toBe('106658601471856_888');
  });

  it('rejects an empty text-only post (no caption, no media)', async () => {
    await expect(publishFacebookPagePost({ id: '1', pageId: GP_CAFE_PAGE_ID, caption: null, mediaUrls: [] }))
      .rejects.toThrow(FacebookGraphError);
    expect(createPageFeedPostMock).not.toHaveBeenCalled();
  });

  it('propagates a real Meta error rather than fabricating success', async () => {
    createPageFeedPostMock.mockRejectedValue(new FacebookGraphError('Invalid parameter', 400, undefined, 100));
    await expect(publishFacebookPagePost({ id: '1', pageId: GP_CAFE_PAGE_ID, caption: 'hello', mediaUrls: [] }))
      .rejects.toThrow(FacebookGraphError);
  });
});
