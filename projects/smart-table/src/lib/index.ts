import { HyperlinkComponent } from './hyperlink/hyperlink.component';
import { MailToComponent } from './mail-to/mail-to.component';
import { SmartTableComponent } from './smart-table/smart-table.component';
import { SmartTableService } from './smart-table/smart-table.service';
import { TableCheckboxFilterComponent } from './table-checkbox-filter/table-checkbox-filter.component';
import { TableDatepickerFilterComponent } from './table-datepicker-filter/table-datepicker-filter.component';
import { TableInputFilterComponent } from './table-input-filter/table-input-filter.component';
import { TableMultiSelectFilterComponent } from './table-multi-select-filter/table-multi-select-filter.component';
import { TableSelectFilterComponent } from './table-select-filter/table-select-filter.component';

export const components = [
    SmartTableComponent,
    TableInputFilterComponent,
    TableSelectFilterComponent,
    TableDatepickerFilterComponent,
    TableMultiSelectFilterComponent,
    MailToComponent,
    HyperlinkComponent,
    TableCheckboxFilterComponent
];

export const services = [SmartTableService];
