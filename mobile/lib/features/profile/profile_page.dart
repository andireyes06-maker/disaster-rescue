import '../notifications/notification_action.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_controller.dart';
import '../../auth/auth_repository.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../auth/auth_widgets.dart';
import 'change_password_dialog.dart';
import '../../theme/product_widgets.dart';
import '../../theme/app_theme.dart';
import '../../widgets/user_avatar.dart';

const privacyNotice =
    '$consentText Your exact location is visible only to the dispatcher, the disaster office, the responder '
    'assigned to your report, and you. Public views show an approximate area.';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key, required this.user});
  final AuthUser user;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

const _saveFailed = 'Could not save your photo. Your current photo is unchanged.';
const _removeFailed =
    'Could not remove your photo. Your current photo is unchanged.';

/// The same plain reasons as the web: size first, then type (checked from the file's bytes).
String? profilePhotoProblem(PickedPhoto p) {
  if (p.bytes.length > maxPhotoBytes) {
    return 'This photo is larger than 5 MB. Choose a smaller photo.';
  }
  if (validatePhoto(p) != null) return 'Choose a JPEG, PNG or WebP photo.';
  return null;
}

class _ProfilePageState extends State<ProfilePage> {
  late Future<Profile?> _profile = context.read<ProfileRepository>().load(
    widget.user.uid,
  );

  // The shown photo only changes after the server confirms, so a failure always leaves the old one.
  bool _photoChanged = false;
  String? _photoUrl;
  bool _photoBusy = false;
  String _photoStatus = '';
  bool _photoFailed = false;

  void _say(String message, {bool failed = false}) {
    _photoStatus = message;
    _photoFailed = failed;
  }

  Future<void> _changePhoto() async {
    if (_photoBusy) return;
    final photos = context.read<PhotoService>();
    final profiles = context.read<ProfileRepository>();
    setState(() {
      _photoBusy = true;
      _say('');
    });
    final List<PickedPhoto> picked;
    try {
      // Gallery only: the profile photo adds no new camera use.
      picked = await photos.pick(1);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _photoBusy = false;
        _say('Could not open your photos. Try again.', failed: true);
      });
      return;
    }
    if (!mounted) return;
    if (picked.isEmpty) {
      setState(() => _photoBusy = false);
      return;
    }
    final photo = picked.first;
    final problem = profilePhotoProblem(photo);
    if (problem != null) {
      setState(() {
        _photoBusy = false;
        _say(problem, failed: true);
      });
      return;
    }
    setState(() => _say('Saving your photo...'));
    try {
      final url = await profiles.setPhoto(photo);
      if (!mounted) return;
      setState(() {
        _photoChanged = true;
        _photoUrl = url;
        _say('Your photo is saved.');
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _say(_saveFailed, failed: true));
    } finally {
      if (mounted) setState(() => _photoBusy = false);
    }
  }

  Future<void> _removePhoto() async {
    if (_photoBusy) return;
    final profiles = context.read<ProfileRepository>();
    setState(() {
      _photoBusy = true;
      _say('Removing your photo...');
    });
    try {
      await profiles.removePhoto();
      if (!mounted) return;
      setState(() {
        _photoChanged = true;
        _photoUrl = null;
        _say('Your photo is removed.');
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _say(_removeFailed, failed: true));
    } finally {
      if (mounted) setState(() => _photoBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: const [NotificationAction()],
      ),
      body: ProductViewport(
        child: FutureBuilder<Profile?>(
          future: _profile,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const ProductLoading();
            }
            if (snap.hasError) {
              return ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  const InlineError(
                    'Could not load your profile. Your account details have not been changed.',
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: () => setState(() {
                      _photoChanged = false;
                      _photoUrl = null;
                      _profile = context.read<ProfileRepository>().load(
                        widget.user.uid,
                      );
                    }),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Try again'),
                  ),
                ],
              );
            }
            final p = snap.data;
            final photoUrl = _photoChanged ? _photoUrl : p?.photoUrl;
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                ProductSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          UserAvatar(
                            name: p?.name ?? '',
                            photoUrl: photoUrl,
                            size: 54,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Your account',
                                  style: Theme.of(
                                    context,
                                  ).textTheme.headlineSmall,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  widget.user.role == 'responder'
                                      ? 'Responder profile'
                                      : 'Resident profile',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 10,
                        runSpacing: 8,
                        children: [
                          OutlinedButton.icon(
                            onPressed: _photoBusy ? null : _changePhoto,
                            icon: const Icon(Icons.photo_camera_outlined),
                            label: const Text('Change photo'),
                          ),
                          if (photoUrl != null)
                            OutlinedButton.icon(
                              onPressed: _photoBusy ? null : _removePhoto,
                              icon: const Icon(Icons.delete_outline),
                              label: const Text('Remove photo'),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'JPEG, PNG or WebP, up to 5 MB.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      if (_photoStatus.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        if (_photoFailed)
                          InlineError(_photoStatus)
                        else
                          Semantics(
                            liveRegion: true,
                            child: Text(_photoStatus),
                          ),
                      ],
                      const Divider(),
                      ProductDatum(
                        label: 'Name',
                        value: p?.name?.isNotEmpty == true
                            ? p!.name!
                            : 'Not set',
                        icon: Icons.person_outline_rounded,
                      ),
                      ProductDatum(
                        label: 'Email',
                        value: widget.user.email ?? 'Not set',
                        icon: Icons.alternate_email_rounded,
                      ),
                      ProductDatum(
                        label: 'Phone',
                        value: p?.phone?.isNotEmpty == true
                            ? p!.phone!
                            : 'Not set',
                        icon: Icons.phone_outlined,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                ProductSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.shield_outlined,
                            color: AppColors.primary,
                            size: 21,
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'Privacy',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Text(privacyNotice),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                OutlinedButton.icon(
                  onPressed: () => showChangePasswordDialog(context),
                  icon: const Icon(Icons.lock_outline),
                  label: const Text('Change password'),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => context.read<AuthController>().logout(),
                  icon: const Icon(Icons.logout),
                  label: const Text('Log out'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
