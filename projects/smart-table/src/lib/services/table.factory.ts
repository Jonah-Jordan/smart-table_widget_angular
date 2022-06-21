import {Injectable} from '@angular/core';
import {
  SmartTableColumnConfig,
  SmartTableColumnCustomType,
  SmartTableColumnType,
  SmartTableFilter,
  SmartTableFilterConfig
} from '../smart-table/smart-table.types';
import {ConstructableCell, TableColumn} from '@acpaas-ui/ngx-table';
import {DatePipe} from '@angular/common';
import { MailToComponent } from '../mail-to/mail-to.component';

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
      classList: columnConfig.multiline ? ['multi-line'] : ['']
    };
    if (columnConfig.visible || columnConfig.visible == null) {
      if (Array.isArray(columnConfig.classList) && columnConfig.classList.length) {
        column.classList = columnConfig.classList;
      }

      const columnType = columnTypes.find(ct => ct.name === columnConfig.type);
      if (columnType) {
        column.format = columnType.format;
        // column.component = columnType.component;
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
