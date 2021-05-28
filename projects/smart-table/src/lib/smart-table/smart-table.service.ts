import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as queryString from 'query-string';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';

import { SmartTableDataQuery } from './smart-table.types';
import { DatePipe } from '@angular/common';

const EXCEL_EXTENSION = '.xlsx';
const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

@Injectable()
export class SmartTableService {
    constructor(private http: HttpClient, private datePipe: DatePipe) {}

    public getConfiguration(apiUrl: string, headers?: HttpHeaders): Observable<any> {
        if (!headers) {
            headers = new HttpHeaders();
        }
        return this.http.get(`${apiUrl}/config`, { headers });
    }

    public getData(
        apiUrl: string,
        headers: HttpHeaders,
        dataQuery: SmartTableDataQuery,
        page?: number,
        pageSize?: number
    ): Observable<any> {
        if (!headers) {
            headers = new HttpHeaders();
        }
        const queryParams = queryString.stringify({
            page,
            pageSize
        });
        headers = headers.set('Content-Type', 'application/json');
        return this.http.post(`${apiUrl}${queryParams ? `?${queryParams}` : ''}`, JSON.stringify(dataQuery), { headers });
    }

    public getAllData(apiUrl: string, headers: HttpHeaders, dataQuery: SmartTableDataQuery): Observable<any> {
        if (!headers) {
            headers = new HttpHeaders();
        }

        headers = headers.set('Content-Type', 'application/json');
        return this.http.post(`${apiUrl}/all`, JSON.stringify(dataQuery), { headers });
    }

    public exportAsExcelFile(json: any[], excelFileName: string): void {
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(json);
        const workbook: XLSX.WorkBook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
        const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, excelFileName);
    }

    private saveAsExcelFile(buffer: any, fileName: string): void {
        const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
        FileSaver.saveAs(data, fileName + '_' + this.datePipe.transform(new Date(), 'dd:MM:yyyy_HH:mm:ss') + EXCEL_EXTENSION);
    }
}
