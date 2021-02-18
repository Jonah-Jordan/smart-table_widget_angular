import { EventEmitter, Input, OnDestroy, Output, Directive } from '@angular/core';
import {SmartTableFilter, UpdateFilterArgs} from '../smart-table/smart-table.types';
import {FormControl} from '@angular/forms';
import {Subject} from 'rxjs';
import {debounceTime, takeUntil, tap} from 'rxjs/operators';
import * as _ from 'lodash';

@Directive()
export abstract class AbstractFilter implements OnDestroy {
  @Input() filter: SmartTableFilter;
  @Input() optional = false;
  @Output() update = new EventEmitter<UpdateFilterArgs>();

  public id: string;
  public value: string;

  public formControl: FormControl = new FormControl();
  public destroy$ = new Subject();

  constructor() {
    this.id = `filter-${_.uniqueId()}`;
    this.formControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(200),
      tap((newValue: string) => this.onFilter(newValue)),
    ).subscribe();
  }

  public onFilter(value) {
    if (this.filter) {
      this.filter.value = value;
    }
    this.update.emit({filter: this.filter, value});
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
