import { TestBed } from '@angular/core/testing';

import { GameStateSocketService } from './game-state-socket.service';

describe('GameStateSocketService', () => {
  let service: GameStateSocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameStateSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
