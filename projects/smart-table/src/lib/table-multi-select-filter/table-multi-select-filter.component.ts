import { FilterComponent } from '@acpaas-ui/ngx-utils';
import { AfterViewInit, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AbstractFilter } from '../filter/abstract-filter';

@Component({
    selector: 'aui-table-multi-select-filter',
    templateUrl: './table-multi-select-filter.component.html',
    styleUrls: ['./table-multi-select-filter.component.scss']
})
export class TableMultiSelectFilterComponent extends AbstractFilter implements OnInit, AfterViewInit, FilterComponent {
    @Input() public showTags: boolean;
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

    removeFilterOptions(value: string) {
        this.formControl.value.splice(this.formControl.value.indexOf(value), 1);
        this.formControl.patchValue(this.formControl.value);
        this.totalSelected = this.totalSelected - 1;
    }

    searchCorrectLabel(value: string): string {
        return this.filter.options.find((o) => o.id === value).label;
    }

    public removeAllSelectedValues(filter: FormControl): void {
        filter.value.splice(0, filter.value.length);
        filter.patchValue(filter.value);
        this.totalSelected = 0;
    }
}
