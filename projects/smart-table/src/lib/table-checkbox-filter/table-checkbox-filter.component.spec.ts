import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TableCheckboxFilterComponent } from './table-checkbox-filter.component';

describe('TableCheckboxFilterComponent', () => {
  let component: TableCheckboxFilterComponent;
  let fixture: ComponentFixture<TableCheckboxFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TableCheckboxFilterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TableCheckboxFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
