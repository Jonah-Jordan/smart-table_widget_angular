import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableMultiSelectFilterComponent } from './table-multi-select-filter.component';

describe('TableMultiSelectFilterComponent', () => {
  let component: TableMultiSelectFilterComponent;
  let fixture: ComponentFixture<TableMultiSelectFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TableMultiSelectFilterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TableMultiSelectFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
