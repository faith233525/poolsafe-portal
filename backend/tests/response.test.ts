import { describe, it, expect } from "vitest";
import { buildPaginated, errorResponse, PaginatedResult } from "../src/lib/response";

describe("Response Utilities", () => {
  describe("buildPaginated", () => {
    it("should create paginated result with correct structure", () => {
      const data = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];
      const result = buildPaginated(data, 1, 10, 25);

      expect(result).toEqual({
        data,
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
        items: data, // alias
        pagination: {
          page: 1,
          pageSize: 10,
          total: 25,
          totalPages: 3,
        },
      });
    });

    it("should calculate total pages correctly", () => {
      const result1 = buildPaginated([], 1, 10, 0);
      expect(result1.totalPages).toBe(0);

      const result2 = buildPaginated([], 1, 10, 1);
      expect(result2.totalPages).toBe(1);

      const result3 = buildPaginated([], 1, 10, 15);
      expect(result3.totalPages).toBe(2);

      const result4 = buildPaginated([], 1, 10, 20);
      expect(result4.totalPages).toBe(2);

      const result5 = buildPaginated([], 1, 10, 21);
      expect(result5.totalPages).toBe(3);
    });

    it("should include extra properties when provided", () => {
      const data = [{ id: 1 }];
      const extra = { customField: "value", metadata: { key: "data" } };
      const result = buildPaginated(data, 1, 10, 1, extra);

      expect(result.customField).toBe("value");
      expect(result.metadata).toEqual({ key: "data" });
    });

    it("should handle empty data array", () => {
      const result = buildPaginated([], 1, 10, 0);

      expect(result.data).toEqual([]);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it("should handle single page results", () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = buildPaginated(data, 1, 10, 2);

      expect(result.totalPages).toBe(1);
      expect(result.page).toBe(1);
    });

    it("should properly type the result", () => {
      interface TestItem {
        id: number;
        name: string;
      }

      const data: TestItem[] = [{ id: 1, name: "test" }];
      const result: PaginatedResult<TestItem> = buildPaginated(data, 1, 10, 1);

      expect(result.data[0].id).toBe(1);
      expect(result.data[0].name).toBe("test");
    });

    it("should handle large page numbers", () => {
      const result = buildPaginated([], 99, 10, 1000);

      expect(result.page).toBe(99);
      expect(result.totalPages).toBe(100);
    });
  });

  describe("errorResponse", () => {
    it("should create error response with message only", () => {
      const result = errorResponse("Something went wrong");

      expect(result).toEqual({
        error: "Something went wrong",
        code: undefined,
      });
    });

    it("should create error response with message and code", () => {
      const result = errorResponse("Validation failed", "VALIDATION_ERROR");

      expect(result).toEqual({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
      });
    });

    it("should handle empty message", () => {
      const result = errorResponse("");

      expect(result.error).toBe("");
      expect(result.code).toBeUndefined();
    });

    it("should handle empty code", () => {
      const result = errorResponse("Error message", "");

      expect(result.error).toBe("Error message");
      expect(result.code).toBe("");
    });

    it("should handle special characters in message", () => {
      const message = "Error: User 'john@example.com' not found (ID: 123)";
      const result = errorResponse(message, "USER_NOT_FOUND");

      expect(result.error).toBe(message);
      expect(result.code).toBe("USER_NOT_FOUND");
    });
  });
});
