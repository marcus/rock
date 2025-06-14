# Test Suite Documentation

This directory contains comprehensive tests for Roy's Rock Machine's migration system and API endpoints.

## Test Structure

### Test Files

- **`migrations.test.js`** - Tests for the database migration system
- **`api.test.js`** - Tests for all API endpoints and their functionality
- **`database.test.js`** - Tests for database operations, constraints, and performance
- **`helpers/database.js`** - Test database helper utilities

### Test Categories

#### Migration System Tests
- Migration runner functionality
- Schema migration verification
- Data migration integrity
- Many-to-many relationship support

#### API Endpoint Tests
- Health check endpoint
- Sound pack CRUD operations
- Sound retrieval and management
- Many-to-many relationship management
- Data integrity and concurrent operations

#### Database Tests
- Schema initialization
- CRUD operations
- Constraint enforcement
- Complex queries
- Performance benchmarks

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Running Specific Test Files

```bash
# Run only migration tests
npx jest tests/migrations.test.js

# Run only API tests
npx jest tests/api.test.js

# Run only database tests
npx jest tests/database.test.js
```

### Running Specific Test Suites

```bash
# Run tests matching a pattern
npx jest --testNamePattern="Migration System"
npx jest --testNamePattern="API Endpoints"
npx jest --testNamePattern="Many-to-Many"
```

## Test Database

The tests use an in-memory SQLite database (`TestDatabase` class) that:

- Runs the complete schema and migration system
- Provides isolated test environments
- Supports foreign key constraints
- Includes helper methods for seeding test data
- Automatically cleans up between tests

## Key Features Tested

### Migration System
- ✅ Migration tracking and execution
- ✅ Schema transformation (sound_pack_id → join table)
- ✅ Data migration integrity
- ✅ Index and trigger creation
- ✅ Foreign key constraint handling

### API Functionality
- ✅ All CRUD operations for sound packs and sounds
- ✅ Many-to-many relationship management
- ✅ Error handling and edge cases
- ✅ Data integrity across operations
- ✅ Concurrent operation handling

### Database Operations
- ✅ Schema validation
- ✅ Constraint enforcement
- ✅ Transaction handling
- ✅ Complex query support
- ✅ Performance benchmarks

## Test Data

The test suite includes:

- **Test Categories**: Electronic, Rock, etc.
- **Test Sound Packs**: Default synthesis pack with multiple sounds
- **Test Sounds**: Kick, Snare, Hi-Hat with proper drum types
- **Test Relationships**: Many-to-many sound pack associations

## Coverage

Current test coverage focuses on:

- **Migration System**: ~76% coverage
- **API Endpoints**: 100% functional coverage
- **Database Operations**: Comprehensive constraint and query testing

## Best Practices

### Writing New Tests

1. **Use descriptive test names** that explain what is being tested
2. **Follow the AAA pattern**: Arrange, Act, Assert
3. **Clean up test data** using the provided helper methods
4. **Test both success and failure cases**
5. **Use realistic test data** that matches production scenarios

### Test Organization

```javascript
describe('Feature Name', () => {
  describe('Sub-feature', () => {
    test('should do something specific', async () => {
      // Test implementation
    })
  })
})
```

### Database Testing

```javascript
beforeEach(async () => {
  await testDb.clear()
  testData = await testDb.seedTestData()
})
```

## Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Debug Specific Test
```bash
npm test -- --testNamePattern="specific test name" --verbose
```

### Database Debugging
The test database helper includes console output suppression. To see database operations during testing, modify `tests/setup.js`.

## Continuous Integration

The test suite is designed to:
- Run in CI/CD environments
- Use in-memory databases for speed
- Provide clear failure messages
- Complete within reasonable time limits

## Future Enhancements

Potential areas for test expansion:
- Integration tests with the frontend
- Performance stress testing
- Database migration rollback testing
- API rate limiting tests
- WebSocket functionality tests (if added) 