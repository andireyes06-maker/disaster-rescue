import 'package:flutter/material.dart';
import 'app_theme.dart';

/// The task subtree keeps its keyed position when navigation adapts to width.
class ProductNavigation extends StatelessWidget {
  const ProductNavigation({
    super.key,
    required this.index,
    required this.onChanged,
    required this.destinations,
    required this.body,
  });
  final int index;
  final ValueChanged<int> onChanged;
  final List<NavigationDestination> destinations;
  final Widget body;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, box) {
      final wide = box.maxWidth >= 900;
      return Scaffold(
        body: Row(
          children: [
            if (wide)
              NavigationRail(
                backgroundColor: AppColors.harbor,
                minWidth: 104,
                selectedIndex: index,
                onDestinationSelected: onChanged,
                labelType: NavigationRailLabelType.all,
                leading: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: ProductMark(size: 26),
                ),
                indicatorColor: AppColors.primary,
                selectedIconTheme: const IconThemeData(color: Colors.white),
                unselectedIconTheme: const IconThemeData(
                  color: AppColors.onHarbor,
                ),
                selectedLabelTextStyle: const TextStyle(
                  fontFamily: 'Geist',
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
                unselectedLabelTextStyle: const TextStyle(
                  fontFamily: 'Geist',
                  color: AppColors.onHarbor,
                  fontSize: 12,
                ),
                destinations: [
                  for (final d in destinations)
                    NavigationRailDestination(
                      icon: d.icon,
                      selectedIcon: d.selectedIcon,
                      label: Text(d.label),
                    ),
                ],
              ),
            Expanded(key: const ValueKey('task-body'), child: body),
          ],
        ),
        bottomNavigationBar: wide
            ? null
            : SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.harbor.withValues(alpha: .10),
                          blurRadius: 24,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: NavigationBar(
                        selectedIndex: index,
                        onDestinationSelected: onChanged,
                        destinations: destinations,
                      ),
                    ),
                  ),
                ),
              ),
      );
    },
  );
}

/// The approved I-Report logo (icon plus wordmark, light-on-dark variant for
/// the harbor header). [size] is the height; width keeps the 712:200 ratio.
class ProductMark extends StatelessWidget {
  const ProductMark({super.key, this.size = 36});
  final double size;
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Image.asset(
      'assets/brand/ireport-logo.png',
      height: size,
      width: size * 712 / 200,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
    ),
  );
}
