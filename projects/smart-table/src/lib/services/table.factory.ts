import { TableColumn } from '@acpaas-ui/ngx-table';
import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';

import { MailToComponent } from '../mail-to/mail-to.component';
import {
  SmartTableColumnConfig,
  SmartTableColumnCustomType,
  SmartTableColumnType,
  SmartTableFilter,
  SmartTableFilterConfig,
} from '../smart-table/smart-table.types';

@Injectable()
export class TableFactory {
  constructor(private datePipe: DatePipe) {
  }

  createTableColumnFromConfig(
    columnConfig: SmartTableColumnConfig,
    columnTypes: SmartTableColumnCustomType[], format?: string
  ): TableColumn {
    const column: TableColumn = {
      value: columnConfig.key,
      label: columnConfig.label,
      hidden: !(columnConfig.visible || columnConfig.visible == null),
      disableSorting: !columnConfig.sortPath,
    };
    if (columnConfig.visible || columnConfig.visible == null) {
      if (Array.isArray(columnConfig.classList) && columnConfig.classList.length) {
        column.classList = columnConfig.classList;
      }

      const columnType = columnTypes.find(ct => ct.name === columnConfig.type);
      if (columnType) {
        if (columnType.format) { column.format = columnType.format; }
        if (columnType.component) { column.component = columnType.component; }
        if (columnType.columnClass) { column.columnClass = columnType.columnClass; }
        column.classList = columnType.classList ? columnType.classList : [''];
      } else {
        switch (columnConfig.type) {
          case SmartTableColumnType.DateTime: {
            column.format = value => this.datePipe.transform(value,
              format || 'dd/MM/yyyy - hh:mm');
            break;
          }
          case SmartTableColumnType.Date: {
            column.format = value => this.datePipe.transform(value,
              format || 'dd/MM/yyyy');
            break;
          }
        }
      }
    }
    if (columnConfig.mail) {
      column.component =  MailToComponent,
      column.format = (value) => {
        return { email: value};
      };
    }
    return column;
  }

  createSmartFilterFromConfig(filterConfig: SmartTableFilterConfig): SmartTableFilter {
    const _filter = new SmartTableFilter();
    _filter.id = filterConfig.id;
    _filter.type = filterConfig.type;
    _filter.fields = [filterConfig.field];
    _filter.operator = filterConfig.operator;
    _filter.label = filterConfig.label;
    _filter.placeholder = filterConfig.placeholder;
    _filter.options = filterConfig.options;
    _filter.value = filterConfig.value;
    return _filter;
  }
}
