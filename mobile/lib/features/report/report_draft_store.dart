import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../data/report_models.dart';

/// Keeps the unsent report on the phone. Photos, the contact name and the contact phone are never stored:
/// the resident retypes those after a restart (the form refills them from the profile when it can).
abstract class DraftStore {
  Future<void> save(ReportDraft draft);
  Future<ReportDraft?> load();
  Future<void> clear();

  /// True after an uncertain send, until a confirmed send, a discard, or an explicit new-report action.
  Future<bool> loadUncertainSend();
  Future<void> setUncertainSend(bool value);
}

/// Drafts belong to one signed-in account. Each account's draft has its own key, so a draft saved
/// by one resident is never shown to another account on the same phone. Without a signed-in account,
/// nothing is saved or loaded.
class ReportDraftStore implements DraftStore {
  ReportDraftStore({required this.currentUid});

  /// Returns the signed-in account's uid, or null when nobody is signed in.
  final String? Function() currentUid;

  // The pre-ownership key cannot be attributed to an account, so it is deleted rather than adopted.
  static const _legacyKey = 'report_draft_v1';
  static const _prefix = 'report_draft_v2:';

  String? get _key {
    final uid = currentUid();
    return uid == null || uid.isEmpty ? null : '$_prefix$uid';
  }

  Future<SharedPreferences> _prefs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_legacyKey);
    return prefs;
  }

  /// The stored form of a draft: the contact fields are left out.
  static Map<String, dynamic> _stored(Map<String, dynamic> j) => Map<String, dynamic>.of(j)
    ..remove('contactName')
    ..remove('contactPhone');

  @override
  Future<void> save(ReportDraft draft) async {
    final key = _key;
    if (key == null) return;
    final prefs = await _prefs();
    await prefs.setString(key, jsonEncode(_stored(draft.toJson())));
  }

  @override
  Future<ReportDraft?> load() async {
    final key = _key;
    if (key == null) return null;
    final prefs = await _prefs();
    final s = prefs.getString(key);
    if (s == null) return null;
    try {
      final j = jsonDecode(s);
      if (j is Map<String, dynamic>) {
        // Drafts saved by earlier builds may still hold the contact fields. Remove them from the phone.
        if (j.containsKey('contactName') || j.containsKey('contactPhone')) {
          await prefs.setString(key, jsonEncode(_stored(j)));
        }
        return ReportDraft.fromJson(_stored(j));
      }
    } catch (_) {}
    return null;
  }

  @override
  Future<void> clear() async {
    final key = _key;
    if (key == null) return;
    final prefs = await _prefs();
    await prefs.remove(key);
  }

  // Stores only a boolean per account: no submission key, report text or photo bytes (F02, C2).
  String? get _uncertainKey {
    final key = _key;
    return key == null ? null : '$key:uncertain';
  }

  @override
  Future<bool> loadUncertainSend() async {
    final key = _uncertainKey;
    if (key == null) return false;
    final prefs = await _prefs();
    return prefs.getBool(key) ?? false;
  }

  @override
  Future<void> setUncertainSend(bool value) async {
    final key = _uncertainKey;
    if (key == null) return;
    final prefs = await _prefs();
    if (value) {
      await prefs.setBool(key, true);
    } else {
      await prefs.remove(key);
    }
  }
}
