import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Up to two letters from the first two words of a name ("Maria Santos Cruz" gives "MS").
String initialsOf(String name) => name
    .trim()
    .split(RegExp(r'\s+'))
    .where((w) => w.isNotEmpty)
    .take(2)
    .map((w) => w.characters.first)
    .join()
    .toUpperCase();

/// A person's mark: their photo when it loads, otherwise their initials, otherwise a neutral icon.
/// It always sits next to the person's name, so it is decoration and hidden from screen readers.
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    required this.name,
    this.photoUrl,
    this.size = 54,
  });

  final String name;
  final String? photoUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    final url = photoUrl;
    final fallback = _Fallback(name: name, size: size);
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: size,
        child: ClipOval(
          child: url == null || url.isEmpty
              ? fallback
              : Image.network(
                  url,
                  key: ValueKey(url),
                  width: size,
                  height: size,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => fallback,
                ),
        ),
      ),
    );
  }
}

class _Fallback extends StatelessWidget {
  const _Fallback({required this.name, required this.size});
  final String name;
  final double size;

  @override
  Widget build(BuildContext context) {
    final initials = initialsOf(name);
    return Container(
      color: AppColors.primarySoft,
      alignment: Alignment.center,
      child: initials.isEmpty
          ? Icon(
              Icons.person_outline_rounded,
              color: AppColors.primary,
              size: size * 0.52,
            )
          : Text(
              initials,
              style: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
                fontSize: size * 0.36,
              ),
            ),
    );
  }
}
