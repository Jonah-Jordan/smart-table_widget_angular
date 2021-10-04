import {Component} from '@angular/core';
import {Cell} from '@acpaas-ui/ngx-table';

@Component({
  template: `
    <div role="img" attr.aria-label="{{ starRating() }} van 5">
      <aui-icon name="ai-{{ (starRating() >= 1) ? 'rating-star' : '' }}"></aui-icon>
      <aui-icon name="ai-{{ (starRating() >= 2) ? 'rating-star' : '' }}"></aui-icon>
      <aui-icon name="ai-{{ (starRating() >= 3) ? 'rating-star' : '' }}"></aui-icon>
      <aui-icon name="ai-{{ (starRating() >= 4) ? 'rating-star' : '' }}"></aui-icon>
      <aui-icon name="ai-{{ (starRating() >= 5) ? 'rating-star' : '' }}"></aui-icon>
    </div>
  `,
})
export class AppRatingComponent implements Cell {
  // score from 0 to 10
  public data: any;

  public starRating(): number {
    if (this.data >= 9) {
      return 5;
    } else {
      return Math.floor(this.data / 2);
    }
  }
}
