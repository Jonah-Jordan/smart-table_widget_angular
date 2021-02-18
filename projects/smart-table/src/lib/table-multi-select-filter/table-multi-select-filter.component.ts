import { FilterComponent } from '@acpaas-ui/ngx-utils';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AbstractFilter } from '../filter/abstract-filter';

@Component({
    selector: 'aui-table-multi-select-filter',
    templateUrl: './table-multi-select-filter.component.html',
    styleUrls: ['./table-multi-select-filter.component.scss']
})
export class TableMultiSelectFilterComponent extends AbstractFilter implements OnInit, AfterViewInit, FilterComponent {
    public totalSelected = 0;

    constructor(private cdRef: ChangeDetectorRef) {
        super();
    }

    ngOnInit(): void {}

    ngAfterViewInit(): void {
        try {
            if (this.filter && Array.isArray(this.filter.value)) {
                const foundOptions = [];
                this.filter.value.forEach((value) => {
                    const foundOption = this.filter.options.find((option) => option.id.toLowerCase() === (value as string).toLowerCase());
                    foundOptions.push(foundOption.id);
                });
                if (foundOptions) {
                    this.formControl.patchValue(foundOptions);
                    this.totalSelected = foundOptions.length;
                    this.cdRef.detectChanges();
                }
            }
        } catch (err) {
            console.error(err);
            console.warn('Warning: could not set select filter value.');
        }
    }
}
