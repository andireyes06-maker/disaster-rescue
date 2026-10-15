import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../data/report_models.dart';

/// Keeps the unsent report on the phone. Photos are never stored.
abstract class DraftStore {
  Future<void> save(ReportDraft draft);
  Future<ReportDraft?> load();
  Future<void> clear();
}

class ReportDraftStore implements DraftStore {
  static const _key = 'report_draft_v1';

  @override
  Future<void> save(ReportDraft draft) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(draft.toJson()));
  }

  @override
  Future<ReportDraft?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final s = prefs.getString(_key);
    if (s == null) return null;
    try {
      final j = jsonDecode(s);
      if (j is Map<String, dynamic>) return ReportDraft.fromJson(j);
    } catch (_) {}
    return null;
  }

  @override
  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
