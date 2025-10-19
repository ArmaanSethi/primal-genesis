# Multiplayer Testing Guide for Primal Genesis

## 🎮 How to Test Multiplayer

### Prerequisites
- Both server and client must be running
- Multiple browser tabs or different browsers
- Same network (localhost testing works fine)

### Step 1: Start the Server
```bash
# In the server directory
cd server
npm start
```
Server will start on port 2567 by default.

### Step 2: Start the Client
```bash
# In the client directory
cd client
npm run dev
```
Client will start on http://localhost:5173

### Step 3: Open Multiple Game Windows
**Option A: Same Browser**
- Open the game URL in multiple browser tabs
- Each tab will be a separate player

**Option B: Different Browsers**
- Open Chrome, Firefox, Safari, etc.
- Each browser instance is a separate player

**Option C: Incognito Mode**
- Open one regular window and one incognito window
- Each session is independent

### Step 4: Join the Game
1. All players should automatically connect to the same room
2. Each player gets a different color (red rectangles)
3. Players can see each other move around
4. Camera follows each player individually in their own window

## 🧪 Multiplayer Features to Test

### ✅ Working Features
- **Player Movement**: All players can move independently
- **Player Visibility**: You can see other players as red rectangles
- **Item Sharing**: Items are instanced - each player gets their own pickups
- **Enemy Sync**: All players see the same enemies
- **Beacon System**: All players contribute to the same beacon objective
- **Boss Fight**: All players fight the same boss together

### 🎯 Testing Scenarios

#### Basic Multiplayer
1. Open 2+ browser tabs
2. Move around - you should see other players
3. Verify cameras follow independently
4. Check that UI shows correctly for each player

#### Cooperative Gameplay
1. Both players find and activate the beacon together
2. Survive the holdout phase as a team
3. Fight the boss together
4. Verify shared objectives work correctly

#### Item Collection
1. Each player should get their own items from chests
2. Verify item effects apply individually
3. Test that pickup messages show per player
4. Check inventory displays correctly for each player

#### Combat Testing
1. Players attack the same enemies
2. Verify enemy health is shared across all players
3. Test that damage calculations work correctly
4. Check boss fight with multiple players

## 🔍 Troubleshooting

### Players Not Seeing Each Other
- **Check server logs**: Ensure all players connected successfully
- **Refresh browsers**: Try reconnecting
- **Check console**: Look for WebSocket connection errors

### Performance Issues
- **Limit players**: Start with 2-3 players max
- **Check network**: Local network is faster than internet
- **Monitor CPU**: Server may struggle with many players

### Sync Issues
- **Check timestamps**: Ensure server and client times are synced
- **Refresh**: Sometimes a simple browser refresh fixes sync issues
- **Check logs**: Server logs show state synchronization events

## 🎮 Best Practices for Testing

1. **Start Small**: Test with 2 players first
2. **Clear Communication**: Use voice chat or messaging
3. **Test Different Browsers**: Chrome, Firefox, Safari
4. **Check All Features**: Movement, combat, items, UI
5. **Monitor Performance**: Watch for lag or delays
6. **Document Issues**: Take screenshots of problems

## 🚀 Advanced Testing

### Stress Testing
- Try 4-6 players simultaneously
- Test with all players activating abilities at once
- Monitor server performance under load

### Cross-Network Testing
- Test players on different WiFi networks
- Try mobile vs desktop combinations
- Test with different internet speeds

### Bug Reporting
When you find issues, report:
- Number of players
- Browser types
- What actions caused the bug
- Server logs (if available)
- Screenshots or recordings

Happy testing! 🎮