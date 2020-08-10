import { Filter } from "@acpaas-ui/ngx-utils";
import { OrderBy, TableColumnFormat } from "@acpaas-ui/ngx-table";
import { Component } from "@angular/core";
import { LocalStorageType } from "@acpaas-ui/ngx-localstorage";

export interface IModuleConfig {
  storageType?: LocalStorageType;
  identifier?: string;
}

/**
 * The smart table's configuration,
 * as returned by the /config endpoint
 */
export interface SmartTableConfig {
  baseFilters?: SmartTableDataQueryFilter[];
  columns?: SmartTableColumnConfig[];
  filters?: SmartTableFilterConfig[];
  options?: SmartTableOptions;
}

export interface SmartTableTranslationsConfig {
  moreFilters?: string;
  export?: string;
  apply?: string;
  openColumnSelector?: string;
}

/**
 * Defaults are provided if these are not specified by the /config endpoint
 * @see smart-table.defaults.ts
 */
export interface SmartTableOptions {
  defaultSortOrder?: OrderBy;
  loadDataMessage?: string;
  noDataMessage?: string;
  errorMessage?: string;
  pageSize?: number;
  /** options for the pagesize dropdown */
  pageSizeOptions?: number[];
  resetSortOrderOnFilter?: boolean;
  /**
   * default format for date/time columns
   * @see https://angular.io/api/common/DatePipe
   */
  columnDateTimeFormat?: string;
  /**
   * default format for date columns
   * @see https://angular.io/api/common/DatePipe
   */
  columnDateFormat?: string;
  storageIdentifier?: string;
  persistTableConfig?: boolean;
  translations?: SmartTableTranslationsConfig;
  page?: number;
  showOptionalFilters?: boolean;
}

export interface SmartTableColumnConfig {
  visible: boolean;
  label: string;
  key: string;
  type: SmartTableColumnType;
  classList?: string[];
  sortPath: string;
  canHide: boolean;
}

export enum SmartTableColumnType {
  Number = "number",
  Text = "text",
  Date = "date",
  DateTime = "dateTime",
}

export interface SmartTableColumnCustomType {
  name: string;
  format?: TableColumnFormat;
  component?: Component;
}

export enum SmartTableFilterType {
  Select = "select",
  Input = "input",
  Datepicker = "datepicker",
}

export enum SmartTableFilterDisplay {
  Generic = "generic",
  Visible = "visible",
  Optional = "optional",
}

export enum SmartTableFilterOperator {
  Equal = "=",
  ILike = "ILIKE",
}

export interface SmartTableFilterConfig {
  id: string;
  type: SmartTableFilterType;
  field: string;
  fields?: string[];
  operator?: SmartTableFilterOperator;
  display: SmartTableFilterDisplay;
  label: string;
  options?: any[]; // Currently applies only to filters of type 'Select'
  placeholder?: string;
  value: string | any[]; // See ACPaaS Filter class
}

export class SmartTableFilter extends Filter {
  type: SmartTableFilterType;
  fields: string[];
  operator?: SmartTableFilterOperator;
  label: string;
  placeholder?: string;
  disabled: boolean;
}

export interface UpdateFilterArgs {
  filter: SmartTableFilter;
  value: string | any[]; // See ACPaaS Filter class
}

export interface SmartTableDataQuery {
  filters: SmartTableDataQueryFilter[];
  sort?: SmartTableDataQuerySortOrder;
}

export interface SmartTableDataQueryFilter {
  fields: string[];
  operator?: SmartTableFilterOperator;
  value: any;
}

export interface SmartTableDataQuerySortOrder {
  path: string;
  ascending: boolean;
}
