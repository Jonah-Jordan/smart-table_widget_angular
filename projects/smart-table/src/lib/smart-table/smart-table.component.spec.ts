import {ComponentFixture, TestBed} from '@angular/core/testing';
import {SmartTableComponent} from './smart-table.component';
import {TableInputFilterComponent} from '../table-input-filter/table-input-filter.component';
import {TableSelectFilterComponent} from '../table-select-filter/table-select-filter.component';
import {TableDatepickerFilterComponent} from '../table-datepicker-filter/table-datepicker-filter.component';
import {ReactiveFormsModule} from '@angular/forms';
import {TableModule} from '@acpaas-ui/ngx-table';
import {ItemCounterModule, PaginationModule} from '@acpaas-ui/ngx-pagination';
import {DatepickerModule} from '@acpaas-ui/ngx-forms';
import {SmartTableService} from './smart-table.service';
import * as sinon from 'sinon';
import {SinonSandbox, SinonStub} from 'sinon';
import {DatePipe} from '@angular/common';
import {LocalstorageService} from '@acpaas-ui/ngx-localstorage';
import {PROVIDE_ID} from '../indentifier.provider';
import {TableFactory} from '../services/table.factory';
import {SmartTableConfig, SmartTableFilterConfig, SmartTableFilterDisplay} from './smart-table.types';
import {cold} from 'jasmine-marbles';

describe('Smart Table Test', () => {
  let component: SmartTableComponent;
  let fixture: ComponentFixture<SmartTableComponent>;
  let storageService: LocalstorageService;
  let mockConfiguration: SmartTableConfig;
  let sandbox: SinonSandbox;
  let factory: TableFactory;
  let service: SmartTableService;
  let mockFilters: SmartTableFilterConfig[];

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    await TestBed.configureTestingModule({
      declarations: [
        SmartTableComponent,
        TableInputFilterComponent,
        TableSelectFilterComponent,
        TableDatepickerFilterComponent
      ],
      imports: [
        ReactiveFormsModule,
        TableModule,
        ItemCounterModule,
        PaginationModule,
        DatepickerModule
      ],
      providers: [
        {
          provide: TableFactory,
          useValue: sinon.createStubInstance(TableFactory)
        },
        {
          provide: SmartTableService,
          useValue: sinon.createStubInstance(SmartTableService)
        },
        {
          provide: DatePipe,
          useValue: sinon.createStubInstance(DatePipe)
        },
        {
          provide: LocalstorageService,
          useValue: sinon.createStubInstance(LocalstorageService)
        },
        {
          provide: PROVIDE_ID,
          useValue: 'test-smart-table'
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SmartTableComponent);
    component = fixture.componentInstance;

    mockConfiguration = {
      columns: [],
      filters: [],
      baseFilters: [],
      options: {
        storageIdentifier: 'id',
        persistTableConfig: false,
      }
    };

    mockFilters = [
      {
        id: 'a',
        display: SmartTableFilterDisplay.Visible
      },
      {
        id: 'b',
        display: SmartTableFilterDisplay.Optional
      }
    ] as any;

    storageService = TestBed.inject(LocalstorageService);
    factory = TestBed.inject(TableFactory);
    sandbox.stub(storageService, 'storage').value({
      getItem: sinon.stub(),
      setItem: sinon.stub()
    });
    service = TestBed.inject(SmartTableService);
    (service.getData as SinonStub).returns(cold('a'));
  });

  afterEach(() => {
    sandbox.reset();
  });

  describe('Creation', () => {
    it('should create a valid component', () => {
      expect(fixture).toBeDefined();
      expect(component).toBeDefined();
    });
  });

  describe('Sourcing Configuration', () => {
    it('should get configuration from api service', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('--a|', {a: mockConfiguration}));
      const spyOnGetColumns = sinon.stub(component, 'getLocalStorageObject');
      fixture.detectChanges();
      const result$ = component.configuration$;
      fixture.detectChanges();
      expect(result$).toBeObservable(cold('--a', {a: mockConfiguration}));
      expect(spyOnGetColumns.calledOnce).toBe(false);
    });

    it('should override the configuration by having custom configuration coming in', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('---(a|)', {a: mockConfiguration}));
      component.configuration = {options: {pageSizeOptions: [10, 11, 12]}};
      fixture.detectChanges();
      const result$ = component.configuration$;
      expect(result$).toBeObservable(cold('---(ab)', {
        a: {...mockConfiguration},
        b: {
          ...mockConfiguration,
          options: {
            ...mockConfiguration.options,
            pageSizeOptions: [10, 11, 12]
          }
        },
      }));
    });

    it('should get persisted configuration when option is set so', () => {
      const spyOnGetLocalStorage = sinon.stub(component, 'getLocalStorageObject').callsFake(config => {
        return {
          ...config,
          options: {
            ...config.options,
            defaultSortOrder: {key: 'k', order: 'asc'}
          }
        };
      });
      sinon.stub(component, 'getConfiguration').returns(cold('--(a|)', {
        a: {
          ...mockConfiguration,
          options: {...mockConfiguration.options, defaultSortOrder: {key: 'k', order: 'asc'}, persistTableConfig: true}
        }
      }));
      fixture.detectChanges();
      expect(component.configuration$).toBeObservable(cold('--a', {
        a: {
          ...mockConfiguration,
          options: {
            ...mockConfiguration.options,
            defaultSortOrder: {key: 'k', order: 'asc'},
            persistTableConfig: true
          }
        }
      }));
      expect(spyOnGetLocalStorage.calledOnce).toBe(true);
    });
  });

  describe('Creating Columns', () => {
    it('should create columns when configuration comes in', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('---a', {
        a: {
          ...mockConfiguration,
          columns: ['a', 'b']
        }
      }));
      (factory.createTableColumnFromConfig as SinonStub).returns('column');
      fixture.detectChanges();
      expect(component.allColumns$).toBeObservable(cold('a--b', {
        a: [],
        b: ['column', 'column']
      }));
    });
  });

  describe('Visible Columns', () => {
    it('should display all columns that are visible by default', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('---(a|)', {
        a: {
          ...mockConfiguration,
          columns: [
            {
              key: 'a'
            },
            {
              key: 'b'
            }
          ]
        }
      }));
      (factory.createTableColumnFromConfig as SinonStub).callsFake((config) => {
        return {value: config.key, hidden: config.key === 'a'};
      });
      fixture.detectChanges();
      expect(component.visibleColumns$).toBeObservable(cold('a--b', {
        a: [],
        b: [
          {
            value: 'b',
            hidden: false
          }
        ]
      }));
    });
    it('should toggle visible columns', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('---(a|)', {
        a: {
          ...mockConfiguration,
          columns: [
            {
              key: 'a',
              visible: true,
            },
            {
              key: 'b',
              visible: true
            }
          ]
        }
      }));
      (factory.createTableColumnFromConfig as SinonStub).callsFake((config) => {
        return {value: config.key, hidden: false};
      });
      component.toggleSelectedColumn$ = cold('-----a', {a: {key: 'a'}}) as any;
      component.toggleHideColumn$ = cold('--------a') as any;
      fixture.detectChanges();
      expect(component.visibleColumns$).toBeObservable(cold('a--b----c', {
        a: [],
        b: [
          {
            value: 'a',
            hidden: true
          },
          {
            value: 'b',
            hidden: false
          }
        ],
        c: [
          {
            value: 'a',
            hidden: true
          },
          {
            value: 'b',
            hidden: false
          }
        ]
      }));
    });
  });

  describe('Selectable Columns', () => {
    it('should get selectable columns from configuration', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('---(a|)', {
        a: {
          ...mockConfiguration,
          columns: [{
            key: 'a',
            canHide: false
          }, {
            key: 'b'
          }]
        }
      }));
      (factory.createTableColumnFromConfig as SinonStub).callsFake((config) => {
        return {value: config.key, hidden: false};
      });
      fixture.detectChanges();
      expect(component.selectableColumns$).toBeObservable(cold('a--b', {
        a: [],
        b: [{value: 'b', hidden: false}]
      }));
    });

    it('should toggle hidden status of selectable column', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('---(a|)', {
        a: {
          ...mockConfiguration,
          columns: [{
            key: 'a',
            canHide: false
          }, {
            key: 'b'
          }]
        }
      }));
      (factory.createTableColumnFromConfig as SinonStub).callsFake((config) => {
        return {value: config.key, hidden: false};
      });
      component.toggleSelectedColumn$ = cold('-------a', {a: {key: 'b'}}) as any;
      fixture.detectChanges();
      expect(component.selectableColumns$).toBeObservable(cold('a--b---c', {
        a: [],
        b: [{
          value: 'b',
          hidden: true
        }],
        c: [{
          value: 'b',
          hidden: true
        }],
      }));
    });
  });

  describe('Persisting Columns in configuration', () => {
    it('should persist columns if set so in configuration', () => {

      sinon.stub(component, 'getConfiguration').returns(cold('---(a|)', {
        a: {
          ...mockConfiguration,
          columns: [{
            key: 'a',
            visible: true
          }, {
            key: 'b',
            visible: false
          }],
          options: {
            ...mockConfiguration,
            persistTableConfig: true,
            storageIdentifier: 'test'
          }
        }
      }));
      (factory.createTableColumnFromConfig as SinonStub).callsFake((column) => {
        return {value: column.key, hidden: !column.visible};
      });
      component.toggleHideColumn$ = cold('-----a') as any;
      fixture.detectChanges();
      expect(component.persistInStorage$).toBeObservable(cold('-----a', {
        a: [{
          key: 'a',
          visible: true
        }, {
          key: 'b',
          visible: false
        }]
      }));
      expect((storageService.storage.setItem as SinonStub).called).toBe(true);
    });

    it('Should handle localstorage properties correctly when new ones are added', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('--a|', {a: mockConfiguration}));
      (component as any).addToLocalStorage('n', 'k', 'v');
      expect((storageService.storage.getItem as SinonStub).calledOnce).toBe(true);
      expect((storageService.storage.setItem as SinonStub).calledOnce).toBe(true);
    });
  });

  describe('Filters', () => {
    it('should create the visible filters', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('---(a|)', {
        a: {
          ...mockConfiguration,
          filters: [...mockFilters]
        }
      }));
      (factory.createSmartFilterFromConfig as SinonStub).callsFake(config => {
        return {
          id: config.id
        };
      });
      fixture.detectChanges();
      expect(component.visibleFilters$).toBeObservable(cold('a--b', {
        a: [],
        b: [{
          id: 'a'
        }]
      }));
    });

    it('should create the optional filters', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('---(a|)', {
        a: {
          ...mockConfiguration,
          filters: [...mockFilters]
        }
      }));
      (factory.createSmartFilterFromConfig as SinonStub).callsFake(config => {
        return {
          id: config.id
        };
      });
      fixture.detectChanges();
      expect(component.optionalFilters$).toBeObservable(cold('a--b', {
        a: [],
        b: [{
          id: 'b'
        }]
      }));
    });

    it('should update the optional filter value when onFilter$', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('---(a|)', {
        a: {
          ...mockConfiguration,
          filters: [...mockFilters]
        }
      }));
      (factory.createSmartFilterFromConfig as SinonStub).callsFake(config => {
        return {id: config.id};
      });
      component.onFilter$ = cold('------a', {a: {filter: {id: 'a'}, value: 'new value'}}) as any;
      fixture.detectChanges();
      expect(component.visibleFilters$).toBeObservable(cold('a--b--c', {
        a: [],
        b: [{id: 'a', value: 'new value'}],
        c: [{id: 'a', value: 'new value'}]
      }));
    });

    it('should update the visible filter value when onFilter$', () => {
      sinon.stub(component, 'getConfiguration').returns(cold('---(a|)', {
        a: {
          ...mockConfiguration,
          filters: [...mockFilters]
        }
      }));
      (factory.createSmartFilterFromConfig as SinonStub).callsFake(config => {
        return {id: config.id};
      });
      component.onFilter$ = cold('------a', {a: {filter: {id: 'b'}, value: 'new value'}}) as any;
      fixture.detectChanges();
      expect(component.optionalFilters$).toBeObservable(cold('a--b--c', {
        a: [],
        b: [{id: 'b', value: 'new value'}],
        c: [{id: 'b', value: 'new value'}]
      }));
    });
  });
});
