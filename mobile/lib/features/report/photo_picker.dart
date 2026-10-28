import 'package:flutter/material.dart';

import '../../data/report_models.dart';
import '../../data/services.dart';
import '../auth/auth_widgets.dart';
import '../../theme/app_theme.dart';

/// Up to five photos. Each is checked for size and file signature on the
/// phone before it is kept, so a bad file never reaches the upload.
class PhotoPickerSection extends StatefulWidget {
  const PhotoPickerSection({
    super.key,
    required this.service,
    required this.photos,
    required this.onChanged,
  });
  final PhotoService service;
  final List<PickedPhoto> photos;
  final ValueChanged<List<PickedPhoto>> onChanged;

  @override
  State<PhotoPickerSection> createState() => _PhotoPickerSectionState();
}

class _PhotoPickerSectionState extends State<PhotoPickerSection> {
  final List<String> _messages = [];
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _recover();
  }

  /// A photo taken just before Android closed the app is added back, checked like any other photo.
  Future<void> _recover() async {
    final List<PickedPhoto> lost;
    try {
      lost = await widget.service.recoverLost();
    } catch (_) {
      return;
    }
    if (!mounted || lost.isEmpty) return;
    final list = [...widget.photos];
    final msgs = <String>[];
    for (final p in lost) {
      if (list.length >= maxPhotos) break;
      final problem = validatePhoto(p);
      if (problem != null) {
        msgs.add('$problem It was not added.');
      } else {
        list.add(p);
      }
    }
    if (list.length != widget.photos.length) {
      msgs.insert(0, 'Your last photo was restored after the app was interrupted.');
      widget.onChanged(list);
    }
    setState(
      () => _messages
        ..clear()
        ..addAll(msgs),
    );
  }

  Future<void> _add({bool camera = false}) async {
    if (_busy) return;
    if (widget.photos.length >= maxPhotos) {
      setState(
        () => _messages
          ..clear()
          ..add('You can add up to 5 photos. Remove one to add another.'),
      );
      return;
    }
    setState(() => _busy = true);
    final msgs = <String>[];
    var list = [...widget.photos];
    try {
      final picked = camera
          ? await widget.service.capture()
          : await widget.service.pick(maxPhotos - list.length);
      for (final p in picked) {
        if (list.length >= maxPhotos) {
          msgs.add('Only 5 photos can be added. The rest were skipped.');
          break;
        }
        final problem = validatePhoto(p);
        if (problem != null) {
          msgs.add('$problem It was not added.');
        } else {
          list.add(p);
        }
      }
    } catch (_) {
      msgs.add(
        camera
            ? 'Could not open the camera. Check camera permission or choose existing photos.'
            : 'Could not open your photos. Try again, or take a new photo.',
      );
    }
    if (!mounted) return;
    setState(() {
      _busy = false;
      _messages
        ..clear()
        ..addAll(msgs);
    });
    if (list.length != widget.photos.length) widget.onChanged(list);
  }

  void _remove(int i) {
    if (_busy) return;
    final list = [...widget.photos]..removeAt(i);
    setState(_messages.clear);
    widget.onChanged(list);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Photos (required, up to 5)',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (var i = 0; i < widget.photos.length; i++)
              Container(
                key: ValueKey('photo-chip-$i'),
                padding: const EdgeInsets.only(left: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.image_outlined,
                      size: 20,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 6),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 140),
                      child: Text(
                        widget.photos[i].name,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Remove photo ${widget.photos[i].name}',
                      icon: const Icon(Icons.close),
                      onPressed: _busy ? null : () => _remove(i),
                    ),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 10,
          runSpacing: 8,
          children: [
            OutlinedButton.icon(
              onPressed: _busy ? null : () => _add(camera: true),
              icon: const Icon(Icons.camera_alt_outlined),
              label: const Text('Take photo'),
            ),
            OutlinedButton.icon(
              onPressed: _busy ? null : () => _add(),
              icon: const Icon(Icons.add_photo_alternate_outlined),
              label: const Text('Choose existing photos'),
            ),
          ],
        ),
        if (_busy) ...[
          const SizedBox(height: 8),
          Semantics(
            liveRegion: true,
            child: const Text('Waiting for your photo…'),
          ),
        ],
        for (final m in _messages) ...[
          const SizedBox(height: 8),
          InlineError(m),
        ],
      ],
    );
  }
}
