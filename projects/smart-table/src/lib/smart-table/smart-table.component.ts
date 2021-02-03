import { FlyoutService } from '@acpaas-ui/ngx-flyout';
import { LocalstorageService } from '@acpaas-ui/ngx-localstorage';
import { OrderBy, TableColumn } from '@acpaas-ui/ngx-table';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Component, EventEmitter, Inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { BehaviorSubject, combineLatest, concat, merge, Observable, of, Subject } from 'rxjs';
import { auditTime, catchError, filter, first, map, shareReplay, skip, startWith, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { PROVIDE_ID } from '../indentifier.provider';
import { TableFactory } from '../services/table.factory';
import { SMARTTABLE_DEFAULT_OPTIONS } from './smart-table.defaults';
import { SmartTableService } from './smart-table.service';
import {
    SmartTableColumnConfig,
    SmartTableColumnCustomType,
    SmartTableConfig,
    SmartTableDataQuery,
    SmartTableDataQueryFilter,
    SmartTableFilter,
    SmartTableFilterConfig,
    SmartTableFilterDisplay,
    SmartTableFilterOperator,
    SmartTableFilterType,
    UpdateFilterArgs
} from './smart-table.types';

@Component({
    selector: 'aui-smart-table',
    styleUrls: ['./smart-table.component.scss'],
    templateUrl: './smart-table.component.html'
})
export class SmartTableComponent implements OnInit, OnDestroy {
    @Input() apiUrl: string;
    @Input() httpHeaders: HttpHeaders;
    @Input() columnTypes: SmartTableColumnCustomType[] = [];

    @Input()
    set configuration(value: SmartTableConfig) {
        this.customConfiguration$.next(value);
    }

    /** fires when the user selects a row */
    @Output() rowClicked = new EventEmitter<any>();

    /** @internal */
    genericFilter$: Observable<SmartTableFilter>;
    /** @internal */
    visibleFilters$: Observable<SmartTableFilter[]>;
    /** @internal */
    optionalFilters$: Observable<SmartTableFilter[]>;
    private cleanOptionalFilters$ = new BehaviorSubject<boolean>(false);

    /** @internal Whether the optional filters are currently visible (if any exist) */
    optionalFiltersVisible = false;
    /** @internal */
    selectableColumns$: Observable<TableColumn[]>;

    private dataQuery$: Observable<SmartTableDataQuery>;

    /**
     * Observable that contains the configuration set for the smart table.
     * This data is collected from two sources:
     *  - configuration coming from the api
     *  - manual @input() configuration that may override api configuration
     */
    configuration$: Observable<SmartTableConfig>;
    /**
     * Custom configuration that comes in with setting the @input() configuration
     */
    public customConfiguration$ = new BehaviorSubject<SmartTableConfig>(null);
    /**
     * Represents all the columns that the table may contain
     */
    allColumns$: Observable<TableColumn[]>;
    /**
     * Represent the columns that are visible at the moment,
     * this array is a subset from the allColumns$ observable
     */
    visibleColumns$: Observable<TableColumn[]>;

    // Fires when the user wants to hide columns
    public toggleHideColumn$: Subject<void> = new Subject();
    // Fires when the user toggles a checkbox to hide a column.
    // This doesn't actually hide the columns but changes data
    public toggleSelectedColumn$: Subject<{ key: string }> = new Subject();

    public persistInStorage$: Observable<SmartTableColumnConfig[]>;

    public onFilter$ = new Subject<UpdateFilterArgs>();

    private destroy$ = new Subject();

    public rows$: Observable<Array<any>>;
    public error$: Observable<HttpErrorResponse>;

    /** @internal */
    orderBy$: Subject<OrderBy> = new BehaviorSubject<OrderBy>(SMARTTABLE_DEFAULT_OPTIONS.defaultSortOrder);
    /** @internal */
    currentPage$ = new BehaviorSubject<number>(1);
    /** @internal */
    pageSize$ = new BehaviorSubject<number>(SMARTTABLE_DEFAULT_OPTIONS.pageSize);
    /** @internal */
    totalResults = 0;
    /** @internal */
    rowsLoading: boolean; // Used to trigger the AUI loading row when there's no data
    /** @internal */
    pageChanging: boolean; // Used to trigger our custom overlay on top of old data
    /** @internal */
    get hasRows(): boolean {
        return !this.rowsLoading && this.totalResults > 0;
    }

    // Use this to have unique ids with multiple smart table instances on one page.
    public instanceId: string = Math.random().toString(36).substr(2, 9);
    private localStorageId: string;
    private persistInStorage: boolean;

    constructor(
        private dataService: SmartTableService,
        private datePipe: DatePipe,
        private flyOutService: FlyoutService,
        private localstorageService: LocalstorageService,
        @Inject(PROVIDE_ID) private storageIdentifier: string,
        private factory: TableFactory
    ) {
        this.rowsLoading = true;
        this.pageChanging = false;
    }

    ngOnInit(): void {
        this.configuration$ = concat(
            this.getConfiguration(), // First get the default configuration
            this.customConfiguration$.pipe(
                // And then override with configuration we get from the user
                filter((config) => !!config),
                switchMap((customConfig) => combineLatest(of(customConfig), this.configuration$).pipe(first())),
                map(([customConfig, configuration]) => {
                    // Whenever we have custom configuration coming in, override existing configuration
                    return {
                        ...configuration,
                        ...customConfig,
                        options: {
                            ...configuration.options,
                            ...customConfig.options
                        }
                    };
                })
            )
        ).pipe(
            // Every time configuration changes, get the columns from the storage again
            // (because storage identifier will most likely have changed)
            map((config) => {
                const passedConfig = config.options.persistTableConfig ? this.getLocalStorageObject(config) : config;
                if (passedConfig.options && passedConfig.options.pageSize) {
                    this.pageSize$.next(passedConfig.options.pageSize);
                }

                if (passedConfig.options && passedConfig.options.page) {
                    this.currentPage$.next(passedConfig.options.page);
                }

                if (config.options.persistTableConfig) {
                    this.persistInStorage = true;
                    this.localStorageId = config.options.storageIdentifier;
                }

                if (config.options && config.options.showOptionalFilters) {
                    this.optionalFiltersVisible = config.options.showOptionalFilters;
                }

                return passedConfig;
            }),
            shareReplay(1)
        );

        // Columns are extracted from configuration
        this.allColumns$ = this.configuration$.pipe(
            tap((config) => this.resetOrderBy(config && config.options && config.options.defaultSortOrder)),
            map((config: SmartTableConfig) =>
                config.columns.map((c) =>
                    this.factory.createTableColumnFromConfig(c, this.columnTypes, SMARTTABLE_DEFAULT_OPTIONS.columnDateFormat)
                )
            ),
            startWith([]),
            shareReplay(1)
        );

        // Persist columns configuration in storage whenever we show/hide columns
        this.persistInStorage$ = this.toggleHideColumn$.pipe(
            tap(() => this.flyOutService.close()),
            switchMap(() => combineLatest(this.configuration$, this.selectableColumns$)),
            filter(
                ([config, selectableColumns]: [SmartTableConfig, TableColumn[]]) =>
                    config.options.persistTableConfig === true && !!config.options.storageIdentifier && !!selectableColumns
            ),
            map(([configuration, selectableColumns]) => {
                configuration.columns.map((column) => {
                    const found = (selectableColumns as Array<TableColumn>).find((c) => c.value === column.key);
                    if (found) {
                        column.visible = !found.hidden;
                    }
                    return column;
                });
                return configuration;
            }),
            tap((config: SmartTableConfig) => this.addToLocalStorage(config.options.storageIdentifier, 'columns', config.columns)),
            map((config) => config.columns)
        );

        /**
         * Visible columns start of with all columns and then
         * will be a subset of all columns whenever the user hides/shows columns
         */
        this.visibleColumns$ = merge(
            this.allColumns$,
            this.toggleHideColumn$.pipe(
                switchMap(() => combineLatest(this.allColumns$, this.selectableColumns$).pipe(take(1))),
                map(([columns, selectableColumns]) => {
                    return columns.map((column) => {
                        const found = selectableColumns.find((c) => c.value === column.value);
                        if (found) {
                            column.hidden = found.hidden;
                        }
                        return column;
                    });
                })
            )
        ).pipe(
            map((columns: Array<TableColumn>) => columns.filter((c) => !!c && !c.hidden)),
            shareReplay(1)
        );

        /**
         * Selectable Columns are all columns that are
         * set in configuration to be hideable
         */
        this.selectableColumns$ = merge(
            combineLatest(this.allColumns$, this.configuration$).pipe(
                map(([allColumns, configuration]) => {
                    return (allColumns as TableColumn[]).filter((column) => {
                        const config = configuration.columns.find((c) => c.key === column.value);
                        return config.canHide !== false;
                    });
                })
            ),
            this.toggleSelectedColumn$.pipe(
                switchMap((v) =>
                    this.selectableColumns$.pipe(
                        take(1),
                        map((selectableColumns) => {
                            const i = (selectableColumns as TableColumn[]).findIndex((c) => c.value === v.key);
                            if (i > -1) {
                                selectableColumns[i].hidden = !selectableColumns[i].hidden;
                            }
                            return selectableColumns;
                        })
                    )
                )
            )
        ).pipe(startWith([]), shareReplay(1));

        // Helper so not to have duplicate code
        const onFilter = (filters: Observable<SmartTableFilter[]>, visible: boolean) =>
            this.onFilter$.pipe(
                switchMap((event: UpdateFilterArgs) =>
                    filters.pipe(
                        filter((filterArray: SmartTableFilter[]) => !!filterArray && filterArray.length > 0),
                        take(1),
                        map((list: Array<SmartTableFilter>) => {
                            const found = list.find((f) => f.id === event.filter.id);
                            if (found) {
                                found.value = event.value;
                            }
                            const smartTableFilterValues = list
                                .filter((smartTableFilter: SmartTableFilter) => smartTableFilter.value)
                                .map((smartTableFilter: SmartTableFilter) => {
                                    return {
                                        id: smartTableFilter.id,
                                        value: smartTableFilter.value
                                    };
                                });
                            this.addToLocalStorage(
                                this.localStorageId,
                                `${visible ? 'visibleFilterValues' : 'optionalFilterValues'}`,
                                smartTableFilterValues
                            );
                            return list;
                        })
                    )
                )
            );

        // Filters are based on the configuration coming in
        this.optionalFilters$ = this.configuration$.pipe(
            filter((config: SmartTableConfig) => !!config && Array.isArray(config.filters) && config.filters.length > 0),
            map((config: SmartTableConfig) => this.setupFilter(config.filters, SmartTableFilterDisplay.Optional)),
            startWith([]),
            shareReplay(1)
        );
        this.optionalFilters$ = merge(this.optionalFilters$, onFilter(this.optionalFilters$, false));

        this.visibleFilters$ = this.configuration$.pipe(
            filter((config: SmartTableConfig) => !!config && Array.isArray(config.filters) && config.filters.length > 0),
            map((config: SmartTableConfig) => this.setupFilter(config.filters, SmartTableFilterDisplay.Visible)),
            startWith([]),
            shareReplay(1)
        );
        this.visibleFilters$ = merge(this.visibleFilters$, onFilter(this.visibleFilters$, true));

        this.genericFilter$ = this.configuration$.pipe(
            map((config: SmartTableConfig) => config.filters.find((f) => f.display === SmartTableFilterDisplay.Generic)),
            filter((f) => !!f),
            map((genericFilter) => {
                const f = new SmartTableFilter();
                f.id = 'generic';
                f.type = SmartTableFilterType.Input;
                f.fields = [...genericFilter.fields];
                f.operator = SmartTableFilterOperator.ILike;
                f.label = genericFilter.label || '';
                f.placeholder = genericFilter.placeholder || '';
                return f;
            }),
            startWith(null),
            shareReplay(1)
        );

        var trigger;
        // Build up the data query based on the different filters
        // A new data query will be created every time that new filters come in
        this.dataQuery$ = combineLatest(
            this.visibleFilters$,
            this.optionalFilters$,
            this.genericFilter$,
            this.configuration$,
            this.orderBy$,
            this.cleanOptionalFilters$
        ).pipe(
            skip(5), // The values are shared replayed, so skip the 5 initial emits of the observables
            map(
                ([visibleFilters, optionalFilters, genericFilter, configuration, orderBy, cleanFilters]: [
                    SmartTableFilter[],
                    SmartTableFilter[],
                    SmartTableFilter,
                    SmartTableConfig,
                    OrderBy,
                    boolean
                ]) => {
                    if (!this.optionalFiltersVisible) {
                        optionalFilters.forEach((f) => (f.value = undefined));
                    }

                    const filters = [
                        ...configuration.baseFilters,
                        ...this.createDataQueryFilters(visibleFilters),
                        ...this.createDataQueryFilters(optionalFilters)
                    ];
                    const createdFilter = this.createDataQueryFilter(genericFilter);
                    if (createdFilter) {
                        filters.push(createdFilter);
                    }
                    return [filters, configuration, orderBy];
                }
            ),
            map(([filters, configuration, orderBy]: [any[], SmartTableConfig, OrderBy]) => {
                if (!orderBy) {
                    return { filters };
                }
                const sortColumn = configuration.columns.find((column) => column.key === orderBy.key);
                if (!sortColumn) {
                    return { filters };
                }
                return {
                    filters,
                    sort: {
                        path: sortColumn.sortPath,
                        ascending: orderBy.order === 'asc'
                    }
                };
            }),
            startWith({ filters: [], sort: { path: '', ascending: false } })
        );

        // Get the data on the bases of the data query
        // or when we change the pagination
        this.rows$ = combineLatest(this.dataQuery$, this.pageSize$, this.currentPage$).pipe(
            auditTime(250), // Skip initial time based values, don't reset the timer after new values come in
            tap(() => (this.pageChanging = !this.rowsLoading)),
            switchMap(([dataQuery, pageSize, page]) => this.dataService.getData(this.apiUrl, this.httpHeaders, dataQuery, page, pageSize)),
            filter((data) => !!data),
            map((data) => {
                this.rowsLoading = false;
                this.pageChanging = false;
                if (data._page) {
                    this.totalResults = data._page.totalElements;
                }
                return data._embedded ? data._embedded.resourceList : [];
            }),
            startWith([]),
            shareReplay(1)
        );

        this.error$ = this.rows$.pipe(
            catchError((err) => of(err)),
            filter((err) => err instanceof HttpErrorResponse)
        );

        // Start the show!
        // the html template subscribes to the configuration, so we don't have to do that manually
        this.persistInStorage$.pipe(takeUntil(this.destroy$)).subscribe();
    }

    public getConfiguration(): Observable<SmartTableConfig> {
        return this.dataService.getConfiguration(this.apiUrl, this.httpHeaders).pipe(
            first(),
            map((configuration: SmartTableConfig) => {
                // Start of with default options and override
                // those with whatever options we get from the configuration
                return {
                    ...configuration,
                    baseFilters: configuration.baseFilters || [],
                    options: {
                        ...SMARTTABLE_DEFAULT_OPTIONS,
                        ...configuration.options
                    }
                };
            }),
            map((config) => {
                // Override the storage identifier is we configured it in the module
                if (this.storageIdentifier) {
                    return {
                        ...config,
                        options: {
                            ...config.options,
                            storageIdentifier: this.storageIdentifier
                        }
                    };
                } else {
                    return config;
                }
            })
        );
    }

    public getLocalStorageObject(configuration: SmartTableConfig) {
        const json = this.localstorageService.storage.getItem(configuration.options.storageIdentifier);

        try {
            const parsed = JSON.parse(json);

            // Columns
            try {
                const localStorageColumns = (parsed.columns || []).filter(
                    (column) => !!configuration.columns.find((c) => c.key === column.key)
                );
                const columnsNotInStorage = configuration.columns.filter(
                    (column) => !localStorageColumns.some((c) => c.key === column.key)
                );
                configuration.columns = [...localStorageColumns, ...columnsNotInStorage];
            } catch (error) {
                console.warn('Warning: could not parse smart table columns from storage!');
            }

            // Sort order
            try {
                if ('defaultSortOrder' in parsed) {
                    configuration.options.defaultSortOrder = parsed.defaultSortOrder;
                }
            } catch (error) {
                console.warn('Warning: could not parse smart table sort order from storage!');
            }

            // Page Size
            try {
                if ('pageSize' in parsed) {
                    configuration.options.pageSize = parsed.pageSize;
                }
            } catch (error) {
                console.warn('Warning: could not parse smart table page size from storage!');
            }

            // Show optional filters
            try {
                if ('optionalFiltersVisible' in parsed) {
                    configuration.options.showOptionalFilters = parsed.optionalFiltersVisible;
                }
            } catch (error) {
                console.warn('Warning: could not parse optionalFiltersVisible from storage!');
            }

            // Page
            try {
                if ('page' in parsed) {
                    configuration.options.page = parsed.page;
                }
            } catch (error) {
                console.warn('Warning: could not parse smart table page from storage!');
            }

            // Filters
            try {
                if ('optionalFilterValues' in parsed || 'visibleFilterValues' in parsed) {
                    const filterValues: { id: string; value: string }[] = [...parsed.optionalFilterValues, ...parsed.visibleFilterValues];

                    const mappedIds = filterValues.map((fv) => fv.id);

                    configuration.filters
                        .filter((stfc: SmartTableFilterConfig) => mappedIds.indexOf(stfc.id) !== -1)
                        .forEach((stfc: SmartTableFilterConfig) => {
                            stfc.value = filterValues.find((fv) => fv.id === stfc.id).value;
                        });
                }
            } catch (error) {
                console.warn('Warning: could not parse optionalFiltersVisible from storage!');
            }
            try {
                const localStorageFilters = (parsed.filters || []).filter(
                    (configFilter) => !!configuration.filters.find((c) => c.id === configFilter.id)
                );
                const filtersNotInStorage = configuration.filters.filter(
                    (configFilter) => !localStorageFilters.some((c) => c.id === configFilter.id)
                );
                configuration.filters = [...localStorageFilters, ...filtersNotInStorage];
            } catch (error) {
                console.warn('Warning: could not parse smart table filters from storage!');
            }

            // Return updated config
            return configuration;
        } catch (error) {
            console.warn('Warning: could not parse from storage!');
            return configuration;
        }
    }

    public setupFilter(filters: SmartTableFilterConfig[], type: SmartTableFilterDisplay): Array<SmartTableFilter> {
        return filters.filter((f) => f.display === type).map((filterConfig) => this.factory.createSmartFilterFromConfig(filterConfig));
    }

    protected resetOrderBy(defaultSortOrder?) {
        const sortOrder = defaultSortOrder || SMARTTABLE_DEFAULT_OPTIONS.defaultSortOrder;
        if (sortOrder) {
            this.orderBy$.next(sortOrder);
        }
    }

    createDataQueryFilters(filters: SmartTableFilter[]): SmartTableDataQueryFilter[] {
        return filters.filter((f) => f && f.value).map(this.createDataQueryFilter);
    }

    createDataQueryFilter(f: SmartTableFilter): SmartTableDataQueryFilter {
        if (f && f.value) {
            return {
                fields: f.fields,
                operator: f.operator,
                value: f.operator === SmartTableFilterOperator.ILike ? `%${f.value}%` : f.value
            };
        }
    }

    public onPageChanged(page) {
        if (!isNaN(page)) {
            this.currentPage$.next(Number(page));

            this.addToLocalStorage(this.localStorageId, 'page', page);
        }
    }

    public onPageSizeChanged(pageSize) {
        if (!isNaN(pageSize)) {
            this.pageSize$.next(Number(pageSize));

            this.addToLocalStorage(this.localStorageId, 'pageSize', pageSize);
        }
    }

    public onColumnsSelected() {
        this.toggleHideColumn$.next();
    }

    public onClickRow(row) {
        this.rowClicked.emit(row);
    }

    public onFilter(value: UpdateFilterArgs) {
        if (SMARTTABLE_DEFAULT_OPTIONS.resetSortOrderOnFilter) {
            this.resetOrderBy();
        }
        this.onPageChanged(1);
        this.onFilter$.next(value);
    }

    public onOrderBy(orderBy: OrderBy) {
        this.orderBy$.next(orderBy);
        this.addToLocalStorage(this.localStorageId, 'defaultSortOrder', orderBy);
    }

    public toggleOptionalFilters() {
        this.optionalFiltersVisible = !this.optionalFiltersVisible;
        if (this.persistInStorage) {
            this.addToLocalStorage(this.localStorageId, 'optionalFiltersVisible', this.optionalFiltersVisible);
        }

        if (!this.optionalFiltersVisible) {
            this.cleanOptionalFilters$.next(true);
        }
    }

    public exportToExcel() {
        this.pageChanging = true;
        this.dataQuery$
            .pipe(
                first(),
                switchMap((dataQuery) => this.dataService.getAllData(this.apiUrl, this.httpHeaders, dataQuery)),
                switchMap((data) => this.filterOutColumns(data._embedded.resourceList)),
                tap((exportData) => this.dataService.exportAsExcelFile(exportData, 'smart-table')),
                tap(() => (this.pageChanging = false)),
                first()
            )
            .subscribe();
    }

    public toggleSelectedColumn(value) {
        this.toggleSelectedColumn$.next({ key: value });
    }

    private filterOutColumns(data): Observable<Array<TableColumn>> {
        return this.allColumns$.pipe(
            map((cols) => cols.map((c) => c.value)),
            map((columnKeys) => {
                return data.map((d) => {
                    return Object.keys(d)
                        .filter((key) => columnKeys.indexOf(key) >= 0)
                        .reduce((acc, key) => {
                            acc[key] = d[key];
                            return acc;
                        }, {});
                });
            })
        );
    }

    private addToLocalStorage(name: string, key: string, value: any) {
        if (!this.persistInStorage) {
            return;
        }
        let storageObj: any = this.localstorageService.storage.getItem(name);
        storageObj = !storageObj ? {} : JSON.parse(storageObj);
        storageObj[key] = value;
        this.localstorageService.storage.setItem(name, JSON.stringify(storageObj));
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
