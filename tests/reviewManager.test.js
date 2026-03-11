/**
 * ReviewManager Tests
 */

const ReviewManager = require('../lib/ReviewManager');
const fs = require('fs');
const path = require('path');

// Mock drafts path
const TEST_DRAFTS_PATH = path.join(__dirname, '.test-drafts');

describe('ReviewManager', () => {
  let reviewManager;

  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DRAFTS_PATH)) {
      fs.mkdirSync(TEST_DRAFTS_PATH, { recursive: true });
    }
    reviewManager = new ReviewManager(TEST_DRAFTS_PATH);
  });

  afterAll(() => {
    // Cleanup test directory
    if (fs.existsSync(TEST_DRAFTS_PATH)) {
      fs.rmSync(TEST_DRAFTS_PATH, { recursive: true, force: true });
    }
  });

  describe('submitForReview', () => {
    beforeAll(() => {
      // Create a test draft
      const draft = {
        id: 'test-draft-review',
        title: 'Test Draft for Review',
        content: 'Content',
        platform: 'xiaohongshu',
        status: 'draft'
      };
      fs.writeFileSync(
        path.join(TEST_DRAFTS_PATH, 'test-draft-review.json'),
        JSON.stringify(draft, null, 2)
      );
    });

    test('should submit draft for review', () => {
      const review = reviewManager.submitForReview('test-draft-review', {
        submittedBy: 'author',
        message: 'Please review'
      });

      expect(review.status).toBe('pending');
      expect(review.draftId).toBe('test-draft-review');
      expect(review.message).toBe('Please review');
    });

    test('should throw error when submitting already pending draft', () => {
      expect(() => {
        reviewManager.submitForReview('test-draft-review');
      }).toThrow('该草稿已有待审核的记录');
    });
  });

  describe('approve', () => {
    test('should approve review', () => {
      const review = reviewManager.approve('test-draft-review', {
        reviewedBy: 'reviewer',
        message: 'Looks good!'
      });

      expect(review.status).toBe('approved');
      expect(review.reviewedBy).toBe('reviewer');
    });
  });

  describe('listPendingReviews', () => {
    beforeAll(() => {
      // Create another draft
      const draft = {
        id: 'test-draft-pending',
        title: 'Pending Draft',
        content: 'Content',
        platform: 'xiaohongshu',
        status: 'draft'
      };
      fs.writeFileSync(
        path.join(TEST_DRAFTS_PATH, 'test-draft-pending.json'),
        JSON.stringify(draft, null, 2)
      );

      reviewManager.submitForReview('test-draft-pending');
    });

    test('should list pending reviews', () => {
      const reviews = reviewManager.listPendingReviews({ status: 'pending' });

      expect(reviews.length).toBeGreaterThan(0);
      expect(reviews[0].status).toBe('pending');
    });
  });

  describe('getStats', () => {
    test('should return review statistics', () => {
      const stats = reviewManager.getStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('approved');
    });
  });
});
