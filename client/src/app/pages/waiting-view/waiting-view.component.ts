import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-waiting-view',
  templateUrl: './waiting-view.component.html',
  styleUrls: ['./waiting-view.component.scss'],
})
export class WaitingViewComponent implements OnInit {
  accessCode: string;

  ngOnInit() {
    this.generateAccessCode();
  }

  generateAccessCode() {
    this.accessCode = Math.floor(1000 + Math.random() * 9000).toString();
  }
}
