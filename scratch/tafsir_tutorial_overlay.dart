import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:quran_international/Utils/AppColors/app_colors.dart';
import 'package:quran_international/service/database_helper.dart';

class TafsirTutorialOverlay extends StatefulWidget {
  final VoidCallback? onDismissed;
  const TafsirTutorialOverlay({Key? key, this.onDismissed}) : super(key: key);

  @override
  State<TafsirTutorialOverlay> createState() => _TafsirTutorialOverlayState();
}

class _TafsirTutorialOverlayState extends State<TafsirTutorialOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  
  // Hand movement animations
  late Animation<double> _handOpacity;
  late Animation<Offset> _handPosition;
  late Animation<double> _handScale;
  
  // UI interaction animations
  late Animation<double> _bottomSheetSlide;
  late Animation<double> _verseCardPulse;
  
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 5),
    );

    // 0.0 to 1.2s: Hand fades in and slides to the card
    _handOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.24, curve: Curves.easeIn),
      ),
    );

    _handPosition = Tween<Offset>(
      begin: const Offset(0.2, 0.4),
      end: const Offset(0.0, 0.05),
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.3, curve: Curves.easeOutCubic),
      ),
    );

    // 1.2s to 1.8s: Hand clicks/taps (scales down then back up)
    _handScale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.0, end: 0.8),
        weight: 50.0,
      ),
      TweenSequenceItem(
        tween: Tween<double>(begin: 0.8, end: 1.0),
        weight: 50.0,
      ),
    ]).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.28, 0.4, curve: Curves.easeInOut),
      ),
    );

    // 1.8s to 2.4s: Verse card pulses
    _verseCardPulse = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.0, end: 1.03),
        weight: 50.0,
      ),
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.03, end: 1.0),
        weight: 50.0,
      ),
    ]).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.36, 0.48, curve: Curves.easeInOut),
      ),
    );

    // 1.9s to 2.8s: Bottom sheet slides up
    _bottomSheetSlide = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.38, 0.58, curve: Curves.easeOutBack),
      ),
    );

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _dismissOverlay();
      }
    });

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _dismissOverlay() async {
    await DatabaseHelper.instance.setSetting('tafsir_tutorial_shown', 'true');
    if (mounted) {
      widget.onDismissed?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Stack(
        children: [
          // Semi-transparent backdrop to focus attention
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.75),
            ),
          ),

          // Main simulation layout
          SafeArea(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 15.h),
              child: Stack(
                children: [
                  // Instruction banner
                  Positioned(
                    top: 50.h,
                    left: 0,
                    right: 0,
                    child: Column(
                      children: [
                        Text(
                          'TUTORIAL'.tr,
                          style: GoogleFonts.montserrat(
                            color: const Color(0xFFD4AF37),
                            fontWeight: FontWeight.bold,
                            fontSize: 12.sp,
                            letterSpacing: 2.0,
                          ),
                        ),
                        SizedBox(height: 8.h),
                        Text(
                          'tutorial_tafsir_prompt'.tr.isEmpty 
                              ? 'Tap on any Ayah translation to open its Tafsir' 
                              : 'tutorial_tafsir_prompt'.tr,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.montserrat(
                            color: Colors.white,
                            fontSize: 16.sp,
                            fontWeight: FontWeight.w600,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Skip Button in top right
                  Positioned(
                    top: 0,
                    right: 0,
                    child: TextButton(
                      onPressed: _dismissOverlay,
                      child: Row(
                        children: [
                          Text(
                            'skip'.tr,
                            style: GoogleFonts.montserrat(
                              color: Colors.white60,
                              fontSize: 13.sp,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          SizedBox(width: 4.w),
                          const Icon(
                            Icons.arrow_forward_ios_rounded,
                            color: Colors.white60,
                            size: 12,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Progress Bar at the top edge
                  Positioned(
                    top: 10.h,
                    left: 0,
                    right: 0,
                    child: AnimatedBuilder(
                      animation: _controller,
                      builder: (context, child) {
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(10.r),
                          child: LinearProgressIndicator(
                            value: _controller.value,
                            backgroundColor: Colors.white10,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              AppColors.activeAccentColor,
                            ),
                            minHeight: 4.h,
                          ),
                        );
                      },
                    ),
                  ),

                  // Mock Verse Card (Simulating the Reading screen)
                  Center(
                    child: AnimatedBuilder(
                      animation: _verseCardPulse,
                      builder: (context, child) {
                        return Transform.scale(
                          scale: _verseCardPulse.value,
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16.r),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.activeAccentColor.withOpacity(0.2),
                                  blurRadius: 15,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                            padding: EdgeInsets.all(18.w),
                            width: double.infinity,
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      "1:1",
                                      style: GoogleFonts.montserrat(
                                        color: AppColors.activeAccentColor,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13.sp,
                                      ),
                                    ),
                                    Icon(
                                      Icons.more_vert,
                                      color: Colors.black38,
                                      size: 20.sp,
                                    ),
                                  ],
                                ),
                                SizedBox(height: 12.h),
                                Text(
                                  "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
                                  textAlign: TextAlign.right,
                                  textDirection: TextDirection.rtl,
                                  style: TextStyle(
                                    fontSize: 24.sp,
                                    fontWeight: FontWeight.bold,
                                    color: const Color(0xFF111111),
                                  ),
                                ),
                                SizedBox(height: 12.h),
                                Container(
                                  padding: EdgeInsets.all(12.w),
                                  decoration: BoxDecoration(
                                    color: AppColors.activeAccentColor.withOpacity(0.06),
                                    borderRadius: BorderRadius.circular(10.r),
                                    border: Border.all(
                                      color: AppColors.activeAccentColor.withOpacity(0.3),
                                      width: 1.w,
                                    ),
                                  ),
                                  child: Text(
                                    "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
                                    style: GoogleFonts.montserrat(
                                      color: const Color(0xFF333333),
                                      fontSize: 13.sp,
                                      fontWeight: FontWeight.w500,
                                      height: 1.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  // Mock Bottom Sheet Sliding Up
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: AnimatedBuilder(
                      animation: _bottomSheetSlide,
                      builder: (context, child) {
                        return FractionalTranslation(
                          translation: Offset(0.0, _bottomSheetSlide.value),
                          child: Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFF0D1E15), // Dark green Tafsir theme
                              borderRadius: BorderRadius.only(
                                topLeft: Radius.circular(24.r),
                                topRight: Radius.circular(24.r),
                              ),
                              border: Border.all(
                                color: const Color(0xFFD4AF37).withOpacity(0.3),
                                width: 1.w,
                              ),
                            ),
                            padding: EdgeInsets.all(22.w),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Center(
                                  child: Container(
                                    width: 40.w,
                                    height: 5.h,
                                    decoration: BoxDecoration(
                                      color: Colors.white24,
                                      borderRadius: BorderRadius.circular(100.r),
                                    ),
                                  ),
                                ),
                                SizedBox(height: 16.h),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'tafsir'.tr.toUpperCase(),
                                      style: GoogleFonts.montserrat(
                                        color: const Color(0xFFD4AF37),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13.sp,
                                        letterSpacing: 1.0,
                                      ),
                                    ),
                                    Text(
                                      "Al-Fatihah • Ayah 1",
                                      style: GoogleFonts.montserrat(
                                        color: Colors.white70,
                                        fontSize: 12.sp,
                                      ),
                                    ),
                                  ],
                                ),
                                SizedBox(height: 16.h),
                                Text(
                                  "The Basmalah: Initiating with the name of Allah indicates seeking His blessing and assistance. He is Al-Rahman (The Merciful to all creation) and Al-Rahim (Specifically Merciful to the believers). This acts as a foundation of devotion and focus.",
                                  style: GoogleFonts.inter(
                                    color: Colors.white.withOpacity(0.9),
                                    fontSize: 14.sp,
                                    height: 1.5,
                                  ),
                                ),
                                SizedBox(height: 10.h),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  // Animated Pointer/Tap Finger
                  Positioned.fill(
                    child: AnimatedBuilder(
                      animation: _controller,
                      builder: (context, child) {
                        return FractionalTranslation(
                          translation: _handPosition.value,
                          child: Opacity(
                            opacity: _handOpacity.value,
                            child: Center(
                              child: Transform.scale(
                                scale: _handScale.value,
                                child: Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    // Ripple/Tap circle indicator
                                    if (_controller.value >= 0.28 && _controller.value <= 0.45)
                                      TweenAnimationBuilder<double>(
                                        tween: Tween<double>(begin: 0.0, end: 40.0),
                                        duration: const Duration(milliseconds: 500),
                                        builder: (context, val, child) {
                                          return Container(
                                            width: val.w,
                                            height: val.w,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              border: Border.all(
                                                color: const Color(0xFFD4AF37).withOpacity(
                                                  (1.0 - (val / 40.0)).clamp(0.0, 1.0),
                                                ),
                                                width: 2.w,
                                              ),
                                            ),
                                          );
                                        },
                                      ),
                                    // Pointer icon
                                    Transform.translate(
                                      offset: const Offset(15, 15),
                                      child: Icon(
                                        Icons.touch_app_rounded,
                                        color: const Color(0xFFD4AF37),
                                        size: 44.sp,
                                        shadows: const [
                                          Shadow(
                                            color: Colors.black38,
                                            blurRadius: 10,
                                            offset: Offset(2, 2),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
