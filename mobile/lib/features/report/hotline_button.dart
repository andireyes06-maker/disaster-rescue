import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/services.dart';

const noHotlineMessage = 'Hotline numbers are not available on this phone yet. Call your local emergency number.';

/// Calls the first hotline. Shown on every step of the report flow.
class HotlineButton extends StatelessWidget {
  const HotlineButton({super.key, this.filled = false});
  final bool filled;

  Future<void> _call(BuildContext context) async {
    final hotlines = context.read<HotlineRepository>();
    final dialer = context.read<PhoneDialer>();
    final messenger = ScaffoldMessenger.of(context);
    final list = await hotlines.load();
    if (list.isEmpty) {
      messenger.showSnackBar(const SnackBar(content: Text(noHotlineMessage)));
      return;
    }
    final ok = await dialer.dial(list.first.number);
    if (!ok) {
      messenger.showSnackBar(SnackBar(content: Text('Could not start the call. Dial ${list.first.number} yourself.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    const icon = Icon(Icons.call_outlined);
    const label = Text('Call hotline');
    // The semantic node carries its own tap action, so a screen reader can activate the call.
    return Semantics(
      button: true,
      label: 'Call the emergency hotline',
      onTap: () => _call(context),
      excludeSemantics: true,
      child: filled
          ? FilledButton.icon(onPressed: () => _call(context), icon: icon, label: label)
          : OutlinedButton.icon(onPressed: () => _call(context), icon: icon, label: label),
    );
  }
}
