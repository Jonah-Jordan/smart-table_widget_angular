import { FilterComponent } from '@acpaas-ui/ngx-utils';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { AbstractFilter } from '../filter/abstract-filter';

@Component({
    selector: 'aui-table-select-filter',
    templateUrl: './table-select-filter.component.html',
    styleUrls: ['../filter/filter.component.scss'],
})
export class TableSelectFilterComponent extends AbstractFilter implements OnInit, AfterViewInit, FilterComponent {
    public ngOnInit() {}

    public ngAfterViewInit(): void {
        try {
            if (this.filter && typeof this.filter.value === 'string') {
                const foundOption = this.filter.options.find(
                    (option) => option.id.toLowerCase() === (this.filter.value as string).toLowerCase(),
                );
                if (foundOption) {
                    this.formControl.setValue(foundOption.id);
                }
            }
        } catch (err) {
            console.error(err);
            console.warn('Warning: could not set select filter value.');
        }
    }
}
