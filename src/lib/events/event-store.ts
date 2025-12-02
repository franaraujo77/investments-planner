/**
 * Event Store Service
 *
 * Story 1.4: Event-Sourced Calculation Pipeline
 * Implements ADR-002: Event-Sourced Calculations
 *
 * Provides persistence and retrieval for calculation events.
 * Events are immutable - only append operations supported.
 *
 * AC1: Store 4 event types (CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED)
 * AC2: Events linked by correlation_id for audit trail
 */

import { db, type Database } from "@/lib/db";
import { calculationEvents } from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import type { CalculationEvent, CalculationEventType, CalcStartedEvent } from "./types";

/**
 * Parsed event from database with typed payload
 */
export interface StoredEvent {
  id: string;
  correlationId: string;
  userId: string;
  eventType: CalculationEventType;
  payload: CalculationEvent;
  createdAt: Date | null;
}

/**
 * Event Store for Calculation Pipeline
 *
 * Handles persistence and retrieval of calculation events.
 * All events are immutable - no update or delete operations.
 *
 * @example
 * ```typescript
 * const eventStore = new EventStore(db);
 * await eventStore.append(calcStartedEvent);
 * const events = await eventStore.getByCorrelationId(correlationId);
 * ```
 */
export class EventStore {
  constructor(private database: Database = db) {}

  /**
   * Appends a single event to the store
   *
   * AC1: Stores event with one of 4 types
   * AC2: Event includes correlation_id for linking
   *
   * @param userId - User ID for tenant isolation
   * @param event - Calculation event to store
   * @throws Error if insert fails
   */
  async append(userId: string, event: CalculationEvent): Promise<void> {
    const [result] = await this.database
      .insert(calculationEvents)
      .values({
        correlationId: event.correlationId,
        userId,
        eventType: event.type,
        payload: event,
      })
      .returning({ id: calculationEvents.id });

    if (!result) {
      throw new Error(`Failed to append event: ${event.type}`);
    }
  }

  /**
   * Appends multiple events atomically
   *
   * Used for batch operations like overnight scoring where
   * all events should be stored together.
   *
   * @param userId - User ID for tenant isolation
   * @param events - Array of calculation events to store
   * @throws Error if batch insert fails
   */
  async appendBatch(userId: string, events: CalculationEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    await this.database.insert(calculationEvents).values(
      events.map((event) => ({
        correlationId: event.correlationId,
        userId,
        eventType: event.type,
        payload: event,
      }))
    );
  }

  /**
   * Retrieves all events for a calculation by correlation ID
   *
   * AC2: Returns events linked by correlation_id
   *
   * Events are returned in chronological order (oldest first)
   * to support replay functionality.
   *
   * @param correlationId - Correlation ID linking the calculation
   * @returns Array of events in chronological order
   */
  async getByCorrelationId(correlationId: string): Promise<StoredEvent[]> {
    const results = await this.database
      .select()
      .from(calculationEvents)
      .where(eq(calculationEvents.correlationId, correlationId))
      .orderBy(asc(calculationEvents.createdAt));

    return results.map((row) => ({
      id: row.id,
      correlationId: row.correlationId,
      userId: row.userId,
      eventType: row.eventType as CalculationEventType,
      payload: row.payload as CalculationEvent,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Retrieves calculation history for a user
   *
   * Returns events in reverse chronological order (newest first)
   * for display in audit history views.
   *
   * @param userId - User ID for tenant isolation
   * @param limit - Maximum number of events to return (default 100)
   * @returns Array of events in reverse chronological order
   */
  async getByUserId(userId: string, limit = 100): Promise<StoredEvent[]> {
    const results = await this.database
      .select()
      .from(calculationEvents)
      .where(eq(calculationEvents.userId, userId))
      .orderBy(desc(calculationEvents.createdAt))
      .limit(limit);

    return results.map((row) => ({
      id: row.id,
      correlationId: row.correlationId,
      userId: row.userId,
      eventType: row.eventType as CalculationEventType,
      payload: row.payload as CalculationEvent,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Retrieves events of a specific type for a user
   *
   * Useful for finding all CALC_COMPLETED events to show
   * calculation history, or all SCORES_COMPUTED for analysis.
   *
   * @param userId - User ID for tenant isolation
   * @param eventType - Type of event to filter by
   * @param limit - Maximum number of events to return (default 100)
   * @returns Array of events matching the type
   */
  async getByEventType(
    userId: string,
    eventType: CalculationEventType,
    limit = 100
  ): Promise<StoredEvent[]> {
    const results = await this.database
      .select()
      .from(calculationEvents)
      .where(and(eq(calculationEvents.userId, userId), eq(calculationEvents.eventType, eventType)))
      .orderBy(desc(calculationEvents.createdAt))
      .limit(limit);

    return results.map((row) => ({
      id: row.id,
      correlationId: row.correlationId,
      userId: row.userId,
      eventType: row.eventType as CalculationEventType,
      payload: row.payload as CalculationEvent,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Gets the CALC_STARTED event for a calculation
   *
   * Helper method to extract the starting event which contains
   * userId and timestamp metadata.
   *
   * @param correlationId - Correlation ID of the calculation
   * @returns The CALC_STARTED event or null if not found
   */
  async getCalcStartedEvent(correlationId: string): Promise<CalcStartedEvent | null> {
    const events = await this.getByCorrelationId(correlationId);
    const startedEvent = events.find((e) => e.eventType === "CALC_STARTED");
    return startedEvent ? (startedEvent.payload as CalcStartedEvent) : null;
  }
}

/**
 * Default event store instance using the default database connection
 */
export const eventStore = new EventStore();
