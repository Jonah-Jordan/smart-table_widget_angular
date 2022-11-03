import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'aui-hyperlink',
  templateUrl: './hyperlink.component.html',
  styleUrls: ['./hyperlink.component.scss']
})
export class HyperlinkComponent {
  public data: {
    value: string;
    prefix: string;
  };
}
