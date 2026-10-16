import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/report_models.dart';
import '../../data/services.dart';
import '../../theme/app_theme.dart';

const offlineInstructions =
    'Call the hotline, or send an SMS to your local disaster office, then try again when you have a signal.';

/// Shown when a report cannot be sent for lack of a connection. Pops with
/// true when the user asks to try again.
class OfflineHelpPage extends StatefulWidget {
  const OfflineHelpPage({super.key});

  @override
  State<OfflineHelpPage> createState() => _OfflineHelpPageState();
}

class _OfflineHelpPageState extends State<OfflineHelpPage> {
  late final Future<List<Hotline>> _hotlines = context.read<HotlineRepository>().load();

  @override
  Widget build(BuildContext context) {
    final dialer = context.read<PhoneDialer>();
    return Scaffold(
      appBar: AppBar(title: const Text('No connection')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.wifi_off, size: 32),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('We could not confirm that your report reached us.',
                      style: Theme.of(context).textTheme.titleLarge),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text('We saved it on this phone so you do not have to type it again. Tap Try again to send it. The app uses the same submission key, so a report that did reach us is not sent twice.'),
            const SizedBox(height: 16),
            const Text(offlineInstructions),
            const SizedBox(height: 20),
            Text('Hotlines', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            FutureBuilder<List<Hotline>>(
              future: _hotlines,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                final list = snap.data ?? const [];
                if (list.isEmpty) {
                  return const Text('No hotline numbers are saved on this phone. Call your local emergency number.');
                }
                return Column(
                  children: [
                    for (final h in list)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(h.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                                    Text(h.number),
                                  ],
                                ),
                              ),
                              IconButton.filledTonal(
                                tooltip: 'Call ${h.label}',
                                icon: const Icon(Icons.call),
                                onPressed: () => dialer.dial(h.number),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).pop(true),
              icon: const Icon(Icons.refresh),
              label: const Text('Try again'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Back to my report', style: TextStyle(color: AppColors.primary)),
            ),
          ],
        ),
      ),
    );
  }
}
