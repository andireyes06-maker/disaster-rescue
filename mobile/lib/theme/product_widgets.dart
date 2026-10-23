import 'package:flutter/material.dart';
import 'app_theme.dart';
import 'product_motion.dart';

class ProductIntro extends StatelessWidget {
  const ProductIntro({
    super.key,
    required this.title,
    required this.description,
    this.icon = Icons.health_and_safety_outlined,
  });
  final String title;
  final String description;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            color: AppColors.harbor,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: Colors.white, size: 24),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(
                description,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.muted,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

/// A task group, not a separate navigation destination.
class ProductSurface extends StatelessWidget {
  const ProductSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
  });
  final Widget child;
  final EdgeInsetsGeometry padding;
  @override
  Widget build(BuildContext context) => Material(
    color: AppColors.surface,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: const BorderSide(color: AppColors.border),
    ),
    child: Padding(padding: padding, child: child),
  );
}

class ProductDatum extends StatelessWidget {
  const ProductDatum({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
  });
  final String label, value;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 3),
          child: Icon(icon, color: AppColors.muted, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 4),
              Text(value, style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
        ),
      ],
    ),
  );
}

class ProductSteps extends StatelessWidget {
  const ProductSteps({super.key, required this.current});
  final int current;
  @override
  Widget build(BuildContext context) {
    final showLabels = MediaQuery.textScalerOf(context).scale(1) < 1.4;
    return Semantics(
      label: 'Step ${current + 1} of 4',
      child: Row(
        children: [
          for (var i = 0; i < 4; i++)
            Expanded(
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 2,
                          color: i == 0
                              ? Colors.transparent
                              : (i <= current
                                    ? AppColors.primary
                                    : AppColors.border),
                        ),
                      ),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: i <= current
                              ? AppColors.primary
                              : AppColors.surface,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: i <= current
                                ? AppColors.primary
                                : AppColors.border,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: i < current
                            ? const Icon(
                                Icons.check_rounded,
                                color: Colors.white,
                                size: 16,
                              )
                            : Text(
                                '${i + 1}',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: i == current
                                      ? Colors.white
                                      : AppColors.muted,
                                ),
                              ),
                      ),
                      Expanded(
                        child: Container(
                          height: 2,
                          color: i == 3
                              ? Colors.transparent
                              : (i < current
                                    ? AppColors.primary
                                    : AppColors.border),
                        ),
                      ),
                    ],
                  ),
                  if (showLabels) ...[
                    const SizedBox(height: 6),
                    Text(
                      const ['Situation', 'Location', 'Details', 'Review'][i],
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: i == current
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: i == current
                            ? AppColors.primary
                            : AppColors.muted,
                      ),
                    ),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class ProductEmpty extends StatelessWidget {
  const ProductEmpty({
    super.key,
    required this.title,
    required this.description,
    this.icon = Icons.inbox_outlined,
  });
  final String title;
  final String description;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(icon, size: 34, color: AppColors.primary),
          ),
          const SizedBox(height: 24),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 10),
          Text(
            description,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.muted,
              height: 1.6,
            ),
          ),
        ],
      ),
    ),
  );
}

class ProductLoading extends StatelessWidget {
  const ProductLoading({super.key});
  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Loading content',
    child: ExcludeSemantics(
      child: ProductArrival(
        child: ListView.builder(
          padding: const EdgeInsets.all(20),
          itemCount: 4,
          itemBuilder: (context, index) => Container(
            height: 110,
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 150,
                  height: 13,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  height: 10,
                  decoration: BoxDecoration(
                    color: AppColors.bg,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: 110,
                  height: 10,
                  decoration: BoxDecoration(
                    color: AppColors.bg,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

/// Phone layouts remain full width; tablet/browser tasks keep a readable measure.
class ProductViewport extends StatelessWidget {
  const ProductViewport({super.key, required this.child, this.maxWidth = 760});
  final Widget child;
  final double maxWidth;
  @override
  Widget build(BuildContext context) => SafeArea(
    child: Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: child,
      ),
    ),
  );
}

/// Auth forms sit on one measured sheet while the page retains its light ground.
class ProductFormBody extends StatelessWidget {
  const ProductFormBody({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => SafeArea(
    child: SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: ProductSurface(child: child),
        ),
      ),
    ),
  );
}

class ProductPriority extends StatelessWidget {
  const ProductPriority(this.priority, {super.key});
  final String priority;
  @override
  Widget build(BuildContext context) {
    final s = PriorityStyle.of(priority);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: s.color.withValues(alpha: .09),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(s.icon, size: 15, color: s.color),
          const SizedBox(width: 4),
          Text(
            s.label,
            style: TextStyle(
              color: s.color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
