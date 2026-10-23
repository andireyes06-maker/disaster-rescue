import 'package:flutter/material.dart';
import 'app_theme.dart';

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
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.primarySoft,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: AppColors.primary, size: 26),
        ),
        const SizedBox(height: 20),
        Text(title, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          description,
          style: const TextStyle(
            color: AppColors.muted,
            fontSize: 14,
            height: 1.6,
          ),
        ),
      ],
    ),
  );
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
