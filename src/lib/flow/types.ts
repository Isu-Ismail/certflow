// The flow decides which design each data row gets. ONE graph model, shown two ways:
// a simple form (a chain of rules) and a node graph (any branching).
import type { Row } from '$lib/workspace/types';

export const OPERATORS = [
  'is', 'is not', 'contains', 'does not contain', 'starts with', 'ends with', '>', '>=', '<', '<=', 'is empty', 'is not empty',
] as const;
export type Operator = (typeof OPERATORS)[number];
/** Operators that need no value box. */
export const NO_VALUE: readonly Operator[] = ['is empty', 'is not empty'];

export interface Clause { column: string; op: Operator; value: string }

interface Base { id: string; x: number; y: number }
/** Where rows come from: one data list ('combined' or a data file name). Missing = the default list. */
export interface StartNode extends Base {
  type: 'start';
  source?: string;
  /** When rows arrive here from another list: the column of the incoming list and the column of this list that hold the same value (missing = found automatically). */
  matchFrom?: string;
  matchTo?: string;
}
/** An if: true if all (or any) clauses match. Has two outputs, `true` and `false`. */
export interface ConditionNode extends Base { type: 'condition'; match: 'all' | 'any' | 'each'; clauses: Clause[] }
/** An end: rows that arrive here get this design. */
export interface DesignNode extends Base { type: 'design'; design: string }
/** An end: rows that arrive here get no certificate. */
export interface SkipNode extends Base { type: 'skip' }
export type FlowNode = StartNode | ConditionNode | DesignNode | SkipNode;

/**
 * Output of a node. A condition in `each` mode has one "yes" per condition row (`true` = the first row, `y1`, `y2`… = the
 * next rows) and `false` = else. In `all`/`any` mode it has just `true` and `false`.
 */
export type Port = 'out' | 'true' | 'false' | `y${number}`;
/** One edge per (from, port); `id` is `${from}:${port}`. */
export interface FlowEdge { id: string; from: string; port: Port; to: string }

export interface FlowGraph { nodes: FlowNode[]; edges: FlowEdge[] }

export type Outcome = { kind: 'design'; design: string } | { kind: 'skip' } | { kind: 'none' };
/** One data row: which data list, which row of it. */
export interface RowRef { source: string; row: number }
export interface RowResult extends RowRef { outcome: Outcome; path: string[] }

export interface FlowResult {
  rows: RowResult[];
  /** design name -> its rows */
  byDesign: Map<string, RowRef[]>;
  skipped: RowRef[];
  /** rows whose path ended nowhere (a branch is not connected) */
  unassigned: RowRef[];
  /** how many rows pass through each node / edge */
  nodeCounts: Map<string, number>;
  edgeCounts: Map<string, number>;
}

export interface FlowIssue {
  level: 'error' | 'warn';
  nodeId?: string;
  message: string;
  /** a one-click fix: pair a design with the data list its rows come from */
  fix?: { design: string; list: string };
}

/** Helpers shared by the form view. */
export type Target = { kind: 'design'; design: string } | { kind: 'skip' };
export interface FormRule { id: string; match: 'all' | 'any'; clauses: Clause[]; target: Target }
export interface FormModel { rules: FormRule[]; otherwise: Target | null }

export type { Row };
