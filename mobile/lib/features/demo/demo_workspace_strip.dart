import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

/// Demo workspace label from config/demo. The local demo seed writes it; live workspaces have no such flag.
/// Emits null when the flag is off. A failed read also reaches the strip as an error, which shows no label.
Stream<String?> demoWorkspaceLabel(FirebaseFirestore db) => db
    .doc('config/demo')
    .snapshots()
    .map<String?>((snap) {
      final data = snap.data();
      final label = data?['label'];
      return data?['active'] == true && label is String ? label : null;
    });

/// A strip above every screen while the demo workspace is active. Keyed by signed-in user by the caller,
/// so the listener starts again after sign-in (its first read is denied while signed out).
class DemoWorkspaceStrip extends StatefulWidget {
  const DemoWorkspaceStrip({super.key, required this.watch, required this.child});

  final Stream<String?> Function() watch;
  final Widget child;

  @override
  State<DemoWorkspaceStrip> createState() => _DemoWorkspaceStripState();
}

class _DemoWorkspaceStripState extends State<DemoWorkspaceStrip> {
  late final Stream<String?> _label = widget.watch();

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<String?>(
      stream: _label,
      builder: (context, snap) {
        final text = snap.hasError ? null : snap.data;
        if (text == null) return widget.child;
        return Column(
          children: [
            Material(
              color: const Color(0xFFFFF4DC),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Text(
                    text,
                    style: const TextStyle(
                      color: Color(0xFF8A5100),
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            ),
            Expanded(child: widget.child),
          ],
        );
      },
    );
  }
}
