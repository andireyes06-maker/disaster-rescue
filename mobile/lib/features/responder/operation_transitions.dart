/// Mirrors web/src/features/responder/OperationForm.tsx `allowedOperationStatuses`.
/// A null status means the report status is unknown, so every status is offered.
List<String> allowedOperationStatuses(String? reportStatus) {
  if (reportStatus == null) {
    return const ['Team Assigned', 'Rescue in Progress', 'Resolved'];
  }
  if (reportStatus == 'Team Assigned') {
    return const ['Rescue in Progress'];
  }
  if (reportStatus == 'Rescue in Progress') {
    return const ['Rescue in Progress', 'Resolved'];
  }
  return const [];
}
