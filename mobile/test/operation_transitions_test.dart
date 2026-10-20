import 'package:disaster_rescue/features/responder/operation_transitions.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Team Assigned allows only Rescue in Progress, never Resolved', () {
    expect(allowedOperationStatuses('Team Assigned'), ['Rescue in Progress']);
    expect(allowedOperationStatuses('Team Assigned'), isNot(contains('Resolved')));
  });

  test('Rescue in Progress allows Rescue in Progress and Resolved', () {
    expect(allowedOperationStatuses('Rescue in Progress'), ['Rescue in Progress', 'Resolved']);
  });

  test('any other status allows no update', () {
    for (final status in ['Resolved', 'Closed', 'Rejected', 'Duplicate', 'Cancelled', '']) {
      expect(allowedOperationStatuses(status), isEmpty, reason: status);
    }
  });

  test('an unknown status (null) allows all three statuses, as on the web', () {
    expect(allowedOperationStatuses(null), ['Team Assigned', 'Rescue in Progress', 'Resolved']);
  });
}
