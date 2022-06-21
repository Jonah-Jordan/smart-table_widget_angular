import { Component, OnInit } from '@angular/core';
import { AbstractFilter } from '../filter/abstract-filter';
import { FilterComponent } from '@acpaas-ui/ngx-utils';

@Component({
  selector: 'aui-table-checkbox-filter',
  templateUrl: './table-checkbox-filter.component.html',
})
export class TableCheckboxFilterComponent extends AbstractFilter implements OnInit, FilterComponent {
  constructor() {
    super();
  }

  public ngOnInit(): void {
    this.formControl.setValue(true);
  }

}
