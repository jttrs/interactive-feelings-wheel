# Shadow Physics Test - Fixed Light Source

## What Was Fixed
The shadow offset was rotating too quickly, making shadows appear to move faster than a fixed light source would produce.

**Previous Issue**: Complex offset rotation calculations caused unrealistic shadow movement
**Fix**: Simplified to constant offset direction while shadow content rotates normally

## Expected Behavior
With a truly fixed light source from top-left:

1. **Light Source**: Imagine a light shining from the top-left corner of the screen
2. **Shadow Direction**: Shadows should always cast toward bottom-right
3. **Wheel Rotation**: As the wheel rotates, shadows should appear to move relative to the wheel content
4. **Shadow Shape**: Shadow shapes rotate naturally with wheel content

## Test Steps

### 1. Basic Shadow Test
1. Open the application (http://localhost:8080)
2. Click on any emotion wedge to create a shadow
3. Rotate the wheel by dragging
4. **Verify**: Shadow maintains consistent direction relative to screen (bottom-right)

### 2. Multiple Shadow Test
1. Select 2-3 different emotions to create multiple shadows
2. Rotate the wheel in both directions
3. **Verify**: All shadows move together, maintaining same relative positions

### 3. Shadow Movement Test
1. Select an emotion at the top of the wheel
2. Slowly rotate until that emotion is at the bottom
3. **Verify**: Shadow appears to travel around the emotion as if light source stayed fixed

### 4. Shadow Orientation Test
1. Select an emotion and observe its shadow shape
2. Rotate the wheel 180 degrees
3. **Verify**: Shadow shape rotates naturally with wedge, offset stays toward bottom-right

## Success Criteria
✅ Shadows cast in consistent direction (toward bottom-right)
✅ Shadow shapes rotate naturally with wheel content
✅ Shadow offset direction stays constant relative to screen
✅ Shadow movement looks natural/realistic for fixed light source

## Physics Explanation
- **Fixed Light Source**: Acts like sunlight from a consistent direction (top-left)
- **Constant Offset**: Shadow always casts toward bottom-right relative to screen
- **Natural Content Rotation**: Shadow shapes rotate with wheel content
- **Result**: Realistic shadow behavior as if light source is stationary 