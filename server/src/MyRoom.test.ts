import { Client } from 'colyseus';
import { MyRoom } from './rooms/MyRoom';
import { MyRoomState } from './rooms/schema/MyRoomState';
import { assert } from 'chai';

describe('MyRoom', () => {
  let room: MyRoom;

  beforeEach(() => {
    room = new MyRoom();
    // Manually call onCreate to initialize the state and message handlers
    room.onCreate({});
  });

  it('should add a player on join', () => {
    const client = { sessionId: '1' } as Client;
    room.onJoin(client, {});
    assert.equal(room.state.players.size, 1);
    assert.isTrue(room.state.players.has('1'));
  });

  it('should remove a player on leave', () => {
    const client = { sessionId: '1' } as Client;
    room.onJoin(client, {});
    room.onLeave(client, false);
    assert.equal(room.state.players.size, 0);
    assert.isFalse(room.state.players.has('1'));
  });

  it('should update player position on input', () => {
    const client = { sessionId: '1' } as Client;
    room.onJoin(client, {});
    const player = room.state.players.get('1');

    // Assert player exists to satisfy TypeScript's strict null check
    assert.exists(player);

    const initialX = player.x;
    const initialY = player.y;

    // Call the public handler method directly
    room.handleInput(client, { x: 1, y: -1 });

    assert.isAbove(player.x, initialX);
    assert.isBelow(player.y, initialY);
  });
});
