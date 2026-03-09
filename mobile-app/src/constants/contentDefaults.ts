export const CONTENT_DEFAULTS = {
  about: {
    logoUrl: '',
    brandName: 'Forlok',
    tagline: 'Your everyday ride companion',
    version: 'v1.0.0',
    whoWeAre:
      'Forlok is a community-driven mobility platform connecting riders and drivers for affordable, safe, and sustainable commutes across India.',
    features: [
      {
        icon: 'users',
        title: 'Ride Pooling',
        description: 'Share rides with verified commuters heading your way.',
        color: '#4CAF50',
      },
      {
        icon: 'shield',
        title: 'Verified & Safe',
        description: 'Every rider and driver is identity-verified for safety.',
        color: '#F99E3C',
      },
      {
        icon: 'leaf',
        title: 'Eco Friendly',
        description: 'Reduce carbon footprint by sharing rides together.',
        color: '#66BB6A',
      },
      {
        icon: 'car',
        title: 'Vehicle Rental',
        description: 'Rent vehicles from trusted owners near you.',
        color: '#FF9800',
      },
    ],
    stats: [
      { value: '50K+', label: 'Users', icon: 'users' },
      { value: '120K+', label: 'Rides', icon: 'car' },
      { value: '4.8', label: 'Rating', icon: 'star' },
    ],
    contactItems: [
      { icon: 'mail', label: 'Email', value: 'support@forlok.com', action: 'mailto:support@forlok.com' },
      { icon: 'phone', label: 'Phone', value: '+91 98765 43210', action: 'tel:+919876543210' },
      { icon: 'globe', label: 'Website', value: 'www.forlok.com', action: 'https://forlok.com' },
      { icon: 'map_pin', label: 'Address', value: 'Hyderabad, Telangana, India', action: null },
    ],
  },
  terms_conditions: {
    introTitle: 'Terms of Service',
    introSub: 'Please read these terms carefully before using Forlok',
    effectiveText: 'Effective: January 2024',
    introBody:
      'Welcome to Forlok. These Terms and Conditions govern your use of the Forlok mobile application and all related services offered by Forlok Technologies Pvt. Ltd. By accessing or using our platform, you acknowledge that you have read, understood, and agree to be bound by these Terms.',
    contactEmail: 'legal@forlok.com',
    footerLine1: '© 2024 Forlok Technologies Pvt. Ltd. All rights reserved.',
    footerLine2: 'Registered in Hyderabad, Telangana, India.',
    sections: [
      {
        title: 'Acceptance of Terms',
        content:
          'By downloading, installing, or using the Forlok mobile application ("App"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, please do not use the App.\n\nThese Terms constitute a legally binding agreement between you ("User") and Forlok Technologies Pvt. Ltd. ("Company", "we", "us", or "our"), a company registered under the laws of India with its registered office in Hyderabad, Telangana.',
      },
      {
        title: 'User Eligibility & Registration',
        content:
          'To use Forlok, you must:\n\n• Be at least 18 years of age\n• Possess a valid government-issued ID (Aadhaar, PAN, Driving License, etc.)\n• Provide accurate and complete registration information\n• Maintain the security of your account credentials\n\nDrivers must additionally hold a valid Indian driving license appropriate for the vehicle type and have valid vehicle registration and insurance documents. All driver documents are subject to verification before service activation.',
      },
      {
        title: 'Pooling Services',
        content:
          "Forlok's pooling service connects drivers with passengers traveling in similar directions. By using pooling services:\n\n• Drivers agree to offer available seats on their pre-planned routes\n• Passengers agree to share the ride with other verified users\n• The fare is calculated based on distance, route, and number of seats\n• Drivers must adhere to the declared route and pickup/drop-off points\n• Cancellation policies apply as defined in the App for each booking\n• Forlok acts as an intermediary platform and is not a transportation provider",
      },
      {
        title: 'Rental Services',
        content:
          "Forlok's rental service allows users to rent vehicles for personal or commercial use. By using rental services:\n\n• The renter must provide a valid driving license and identity proof\n• Vehicles must be returned in the same condition as received\n• Fuel charges, toll fees, and any fines incurred are the renter's responsibility\n• Insurance coverage is provided as per the vehicle's existing policy\n• The security deposit is refundable upon satisfactory vehicle return\n• Any damage beyond normal wear and tear will be charged to the renter",
      },
      {
        title: 'Pricing, Wallet & Coins',
        content:
          'Forlok provides transparent fare and trip-cost visibility:\n\n• Fares and rental charges are displayed before booking confirmation\n• Pooling settlement is done manually between passenger and driver\n• Wallet features may be used for eligible app-side credits and adjustments\n• Coins can be redeemed for fare discounts as per in-app limits\n• All prices are in Indian Rupees (INR)\n• Cancellation/refund outcomes are shown per booking policy in-app',
      },
      {
        title: 'Safety & Conduct',
        content:
          'All users must adhere to safety standards and respectful conduct:\n\n• Follow all applicable traffic rules and regulations\n• Maintain a respectful and courteous attitude towards co-passengers\n• Do not transport illegal substances, weapons, or hazardous materials\n• Wear seatbelts at all times during the ride\n• Report any safety concerns immediately through the in-app SOS feature\n• Do not discriminate against users based on caste, religion, gender, or region\n• Drivers must not operate vehicles under the influence of alcohol or drugs',
      },
      {
        title: 'Prohibited Activities',
        content:
          'The following activities are strictly prohibited on the Forlok platform:\n\n• Creating fake or duplicate accounts\n• Manipulating reviews, ratings, or booking data\n• Circumventing the platform to arrange off-app transactions\n• Harassing, threatening, or abusing other users\n• Using the platform for any unlawful purpose\n• Sharing account credentials with third parties\n• Tampering with fare calculations or GPS data\n\nViolation of these rules may result in immediate account suspension or termination.',
      },
      {
        title: 'Cancellation & Refund Policy',
        content:
          'Cancellation terms for Forlok services:\n\nPooling:\n• Free cancellation up to 30 minutes before departure time\n• Cancellation within 30 minutes incurs a fee of up to 20% of the fare\n• No-shows are charged the full fare amount\n\nRentals:\n• Free cancellation up to 24 hours before the rental period\n• Cancellation within 24 hours incurs a fee of up to 25% of the rental amount\n• Refund for unused days is subject to a processing fee\n\nForlok reserves the right to modify cancellation policies with prior notice.',
      },
      {
        title: 'Limitation of Liability',
        content:
          'To the maximum extent permitted by applicable Indian law:\n\n• Forlok is a technology platform and not a transportation company\n• We do not guarantee availability, punctuality, or quality of rides\n• We are not liable for any personal injury, property damage, or loss during rides\n• Our total liability shall not exceed the amount paid for the specific service\n• We are not responsible for actions of third-party drivers or passengers\n• Force majeure events (natural disasters, strikes, etc.) absolve liability',
      },
      {
        title: 'Governing Law & Disputes',
        content:
          'These Terms are governed by and construed in accordance with the laws of India:\n\n• Any disputes shall be subject to the exclusive jurisdiction of courts in Hyderabad, Telangana\n• Disputes shall first be attempted to be resolved through mediation\n• If mediation fails, arbitration under the Arbitration and Conciliation Act, 1996 shall apply\n• The language of arbitration shall be English\n• Consumer complaints can be filed with the National Consumer Disputes Redressal Commission as applicable',
      },
      {
        title: 'Modifications to Terms',
        content:
          'Forlok reserves the right to modify these Terms at any time:\n\n• Users will be notified of material changes via email or in-app notifications\n• Continued use of the App after changes constitutes acceptance\n• Users who disagree with updated Terms should discontinue use\n• Previous versions of Terms are available upon request\n\nFor any questions regarding these Terms, contact us at legal@forlok.com.',
      },
    ],
  },
  privacy_policy: {
    introTitle: 'Privacy Policy',
    introSub: 'Your privacy matters to us. Learn how we collect, use, and protect your data.',
    lastUpdatedText: 'Last Updated: January 2024',
    introBody:
      'Forlok Technologies Pvt. Ltd. ("Forlok", "we", "us") respects your privacy and is committed to protecting the personal information you share with us. This Privacy Policy explains what data we collect, how we use it, and the choices you have regarding your information.',
    dpoEmail: 'privacy@forlok.com',
    footerLine1: '© 2024 Forlok Technologies Pvt. Ltd. All rights reserved.',
    footerLine2: 'This policy is governed by the laws of India.',
    sections: [
      {
        title: 'Information We Collect',
        content:
          'We collect information you provide directly (name, phone, email, profile details, IDs for verification), booking and trip information (pickup/drop, route, timestamps), communication data (support messages, feedback), and technical data (device type, app version, crash logs).',
      },
      {
        title: 'Location Data',
        content:
          'To provide ride discovery, tracking, and safety features, we process location data while you use the app. For active trips, location is used for navigation, ETA, and route monitoring. You can control background location permissions in device settings, but some features may be limited.',
      },
      {
        title: 'How We Use Your Information',
        content:
          'We use your information to create and manage accounts, verify user identity, match riders and drivers, enable bookings, improve safety, prevent fraud, provide support, and send essential service updates. Aggregated analytics may be used to improve platform quality and reliability.',
      },
      {
        title: 'Information Sharing',
        content:
          'We share limited trip-related information between matched users to complete rides. We may share data with trusted service providers (cloud hosting, analytics, communication tools) under strict confidentiality. We may disclose data when required by law, court order, or to protect user safety.',
      },
      {
        title: 'Data Security',
        content:
          'We use reasonable administrative, technical, and organizational safeguards to protect personal data, including access controls, encryption in transit, and monitoring. No method is 100% secure, but we continuously improve controls to reduce risk and respond to incidents promptly.',
      },
      {
        title: 'Device Permissions',
        content:
          'Depending on features used, the app may request permissions for location, camera, microphone, storage, contacts, and notifications. These permissions are used only to provide requested functionality such as document upload, SOS support, and trip notifications.',
      },
      {
        title: 'Cookies & Analytics',
        content:
          'We may use app analytics and similar technologies to understand feature usage, diagnose crashes, and improve performance. These insights help us optimize UX, reliability, and support quality while minimizing collection of unnecessary personal information.',
      },
      {
        title: 'Data Retention & Deletion',
        content:
          'We retain data for as long as necessary for service operations, legal obligations, dispute resolution, and safety/fraud prevention. You may request account deletion through app settings or support. Some records may be retained for compliance and audit requirements.',
      },
      {
        title: "Children's Privacy",
        content:
          'Forlok services are intended for users who are at least 18 years old. We do not knowingly collect personal data from children. If we learn that a minor account was created, we will take steps to deactivate the account and remove associated data as required.',
      },
      {
        title: 'Updates to This Policy',
        content:
          'We may update this Privacy Policy from time to time to reflect legal, technical, or business changes. Material updates are communicated through in-app notices, email, or website updates. Continued use of the app after updates indicates acceptance of the revised policy.',
      },
    ],
    rights: [
      { title: 'Right to Access', desc: 'Request a copy of your personal data' },
      { title: 'Right to Rectify', desc: 'Correct inaccurate or incomplete data' },
      { title: 'Right to Delete', desc: 'Request deletion of your personal data' },
      { title: 'Right to Restrict', desc: 'Limit how your data is processed' },
      { title: 'Right to Portability', desc: 'Receive your data in a portable format' },
      { title: 'Right to Object', desc: 'Object to certain processing activities' },
    ],
  },
  intellectual_property: {
    introTitle: 'Intellectual Property',
    introSub: 'Protecting our innovation and your trust',
    lastUpdatedText: 'Last Updated: January 2024',
    introBody:
      'Forlok Technologies Pvt. Ltd. is committed to protecting its intellectual property rights and respecting the intellectual property rights of others.',
    warningTitle: 'Important Notice',
    warningText:
      "Any unauthorized use, reproduction, or distribution of Forlok's intellectual property may result in severe civil and criminal penalties under Indian law.",
    licensingTitle: 'Licensing & Partnerships',
    licensingSub: 'For licensing opportunities, IP inquiries, or partnership proposals:',
    contactEmail1: 'legal@forlok.com',
    contactEmail2: 'partnerships@forlok.com',
    footerLine1: '© 2024 Forlok Technologies Pvt. Ltd. All rights reserved.',
    footerLine2: 'This information is provided for general informational purposes and does not constitute legal advice.',
    sections: [
      {
        title: 'Trademarks',
        content:
          'Forlok name, logo, brand symbols, taglines, and related marks are proprietary assets of Forlok Technologies Pvt. Ltd. Unauthorized use of these marks in any format, including app clones, marketing material, or domain names, is prohibited without prior written permission.',
      },
      {
        title: 'Copyrights',
        content:
          'All app content including source code, user interfaces, text, graphics, icons, images, videos, and documentation is protected by applicable copyright laws. Reproduction, republication, reverse engineering, or distribution without permission is not allowed.',
      },
      {
        title: 'Patents',
        content:
          'Certain platform capabilities, including ride matching logic, route optimization methods, and pricing mechanisms, may be protected by patent filings or proprietary claims. Use of these innovations without authorization may result in legal action.',
      },
      {
        title: 'Trade Secrets',
        content:
          'Confidential know-how such as scoring models, anti-fraud rules, operational playbooks, and internal data pipelines are treated as trade secrets. Access is restricted and protected through organizational controls and confidentiality obligations.',
      },
      {
        title: 'Design Rights',
        content:
          'Forlok visual identity, app flows, component styling, icon treatment, and branded design systems are protected under design and related rights. Copying distinctive layouts or brand presentation to mislead users is strictly prohibited.',
      },
      {
        title: 'Open Source Acknowledgments',
        content:
          'Forlok uses selected open-source components in compliance with their respective licenses. License obligations for third-party packages are honored. Such usage does not grant rights over Forlok proprietary source code, product IP, or branding.',
      },
    ],
  },
  faq: {
    categories: [
      {
        icon: 'user_check',
        title: 'Account & Registration',
        color: '#4CAF50',
        items: [
          {
            question: 'How do I create an account on Forlok?',
            answer:
              'Download the Forlok app from Google Play Store or Apple App Store. Tap "Sign Up", enter your mobile number, verify with OTP, and complete your profile with name, email, and a profile photo. You can register as an Individual or a Company.',
          },
          {
            question: 'What documents do I need for verification?',
            answer:
              'For passengers: A valid government ID (Aadhaar, PAN, or Voter ID).\n\nFor drivers: Driving License, Vehicle Registration Certificate (RC), Vehicle Insurance, and a government ID. All documents are verified within 24-48 hours.',
          },
          {
            question: 'How long does document verification take?',
            answer:
              "Document verification typically takes 24-48 hours. You will receive a notification once your documents are approved. If rejected, you'll be informed of the reason and can re-upload corrected documents.",
          },
          {
            question: 'Can I change my registered phone number?',
            answer:
              'Yes, go to Settings > Account > Change Phone Number. You will need to verify the new number with an OTP. Note that your booking history and wallet balance will remain linked to your account.',
          },
          {
            question: 'How do I delete my account?',
            answer:
              'Go to Settings > Account > Delete Account. Please note that this action is irreversible. Your data will be retained for 90 days as per our privacy policy before permanent deletion.',
          },
        ],
      },
      {
        icon: 'car',
        title: 'Pooling Services',
        color: '#F99E3C',
        items: [
          {
            question: 'What is Forlok Pooling?',
            answer:
              "Forlok Pooling connects drivers with passengers heading in the same direction. Drivers offer available seats on their regular routes, and passengers can book seats at affordable prices. It's cost-effective, eco-friendly, and a great way to commute.",
          },
          {
            question: 'How do I create a pooling offer as a driver?',
            answer:
              'Go to "Offer Services" > "Create Pooling Offer". Enter your from/to locations, date, time, available seats, and price per seat. Review the details and publish your offer. Passengers can then search and book seats on your route.',
          },
          {
            question: 'How do I book a pooling ride as a passenger?',
            answer:
              'Go to "Take Services" > "Search Pooling". Enter your pickup and drop locations, select your travel date, and browse available offers. Choose a ride that matches your route, review driver details and ratings, then confirm your booking.',
          },
          {
            question: 'Can I set stopping points along my route?',
            answer:
              'Yes, when creating a pooling offer, you can add multiple stopping locations along your route. This helps passengers find rides that match their specific pickup/drop points and makes route planning more flexible.',
          },
          {
            question: 'What happens if the driver cancels my ride?',
            answer:
              'If a driver cancels your confirmed booking, the trip is cancelled in-app and you are notified immediately so you can find an alternative ride.',
          },
          {
            question: 'How is the pooling fare calculated?',
            answer:
              'The fare is calculated using route distance, timing, and ride parameters. You see the final fare in the trip summary before confirming your booking.',
          },
        ],
      },
      {
        icon: 'map_pin',
        title: 'Rental Services',
        color: '#9C27B0',
        items: [
          {
            question: 'How does vehicle rental work on Forlok?',
            answer:
              'Vehicle owners list their vehicles for rent with pricing, availability, and pickup location. Renters browse available vehicles, select dates, and book. After verification and confirmation, the vehicle is handed over at the agreed location.',
          },
          {
            question: 'What types of vehicles are available for rent?',
            answer:
              'Forlok offers a variety of vehicles including bikes, scooters, cars (hatchback, sedan, SUV), and commercial vehicles. Availability varies by location. Each listing includes vehicle details, photos, ratings, and pricing.',
          },
          {
            question: 'Is insurance included with rental vehicles?',
            answer:
              "Basic insurance coverage is included through the vehicle owner's existing policy. However, you are responsible for any damages beyond normal wear and tear. We recommend purchasing additional rental protection when booking for extended coverage.",
          },
          {
            question: 'What is the cancellation policy for rentals?',
            answer:
              'Free cancellation up to 24 hours before the rental period starts. Cancellation within 24 hours incurs a fee of up to 25% of the total rental amount. No-shows are charged the full amount. Refunds are processed within 5-7 business days.',
          },
        ],
      },
      {
        icon: 'credit_card',
        title: 'Wallet & Coins',
        color: '#FF9800',
        items: [
          {
            question: 'How does manual settlement work in Forlok?',
            answer:
              'For pooling rides, settlement is done manually between passenger and driver after trip completion. The app handles booking, fare visibility, trip tracking, and completion confirmation.',
          },
          {
            question: 'How does Forlok Wallet work?',
            answer:
              'Forlok Wallet is used to track app-side credits and coin-related adjustments. It remains available alongside the Coins system.',
          },
          {
            question: 'How do I get a refund?',
            answer:
              'If a cancellation policy applies to your booking, the app shows the cancellation impact directly in the booking flow and history.',
          },
          {
            question: 'How do drivers receive their earnings?',
            answer:
              'For manual settlement rides, drivers collect fare directly from passengers. If coins reduced passenger payable fare, eligible compensation is handled through the app wallet logic.',
          },
          {
            question: 'What are Forlok Coins?',
            answer:
              'Forlok Coins are reward points you earn by completing rides, referring friends, and maintaining good ratings. You can redeem coins for ride discounts, wallet credits, and exclusive offers. Check the Earn Coins section for current promotions.',
          },
        ],
      },
      {
        icon: 'shield',
        title: 'Safety & Security',
        color: '#F44336',
        items: [
          {
            question: 'How does Forlok ensure ride safety?',
            answer:
              'Forlok implements multiple safety features: all users are verified with government IDs, real-time GPS tracking during rides, in-app SOS emergency button, ride sharing with trusted contacts, driver rating system, and 24/7 safety support line.',
          },
          {
            question: 'What is the SOS feature?',
            answer:
              "The SOS button is available on every active ride screen. When pressed, it immediately alerts our safety team, shares your live location with your emergency contacts, and optionally connects you to local emergency services (112). It's available 24/7.",
          },
          {
            question: 'How are drivers verified?',
            answer:
              'All drivers go through a multi-step verification: identity verification via Aadhaar/PAN, driving license validation, vehicle registration check, insurance verification, and a background check. Only verified drivers can offer rides on the platform.',
          },
          {
            question: 'Is my personal information safe?',
            answer:
              "Yes. Forlok uses industry-standard encryption (AES-256, TLS 1.3) to protect your data. We never share your personal information with other users beyond what's necessary for ride coordination. Read our Privacy Policy for complete details.",
          },
        ],
      },
      {
        icon: 'star',
        title: 'Ratings & Reviews',
        color: '#FF9800',
        items: [
          {
            question: 'How does the rating system work?',
            answer:
              'After each ride, both drivers and passengers can rate each other on a 1-5 star scale. You can also leave a written review. Ratings are visible on user profiles and help maintain community trust. Consistently low-rated users may face restrictions.',
          },
          {
            question: 'Can I dispute an unfair rating?',
            answer:
              'Yes, if you believe you received an unfair rating, contact our support team within 7 days. Provide details about the ride and your concern. Our team will review the case and may adjust the rating if it violates our community guidelines.',
          },
        ],
      },
      {
        icon: 'clock',
        title: 'Trip Management',
        color: '#607D8B',
        items: [
          {
            question: 'How do I track my ride in real-time?',
            answer:
              "Once a ride starts, the Trip Tracking screen shows a live map with the driver's current location, estimated time of arrival (ETA), distance remaining, and route details. Passengers can share this tracking link with family members for safety.",
          },
          {
            question: 'What happens if the driver takes a different route?',
            answer:
              "Forlok's system monitors route deviations. If a significant deviation is detected, both the driver and passenger are notified. Drivers are encouraged to follow the optimal route. You can contact support if you feel the deviation was unjustified.",
          },
          {
            question: 'How do I view my ride history?',
            answer:
              'Go to the History tab in the app. You can view all past pooling rides and rental bookings, filter by date and status, and see ride details including route and completion info.',
          },
        ],
      },
    ],
  },
  help_support: {
    supportHoursText:
      'Monday - Saturday: 9:00 AM - 9:00 PM IST\nSunday: 10:00 AM - 6:00 PM IST\nEmergency SOS: Available 24/7',
    quickActions: [
      { icon: 'book_open', label: 'FAQs', desc: 'Find quick answers', color: '#F99E3C', route: 'FAQ' },
      { icon: 'bug', label: 'Report Bug', desc: 'Found an issue?', color: '#F44336', route: 'ReportBug' },
      { icon: 'message_square', label: 'Feedback', desc: 'Share your thoughts', color: '#4CAF50', route: 'Feedback' },
    ],
    popularTopics: [
      {
        icon: 'car',
        title: 'How to create a pooling offer',
        color: '#FF9800',
        category: 'Pooling',
        explanation:
          'Go to Offer Services, choose pooling, set route, date, time, seats, and fare, then publish. Your listing becomes visible to matching passengers and updates automatically when seats are booked.',
      },
      {
        icon: 'map_pin',
        title: 'How to book a rental vehicle',
        color: '#9C27B0',
        category: 'Rental',
        explanation:
          'Search rental vehicles by location and dates, compare listings, check owner profile and pricing details, then confirm booking. Keep your ID and required documents ready at pickup.',
      },
      {
        icon: 'credit_card',
        title: 'Trip completion & refunds',
        color: '#F99E3C',
        category: 'Trips',
        explanation:
          'Complete trip steps in-app to update status. Refund and cancellation outcomes depend on policy and booking state. For disputed cases, use support with booking reference for faster resolution.',
      },
      {
        icon: 'file_text',
        title: 'Cancellation policy',
        color: '#F44336',
        category: 'Policy',
        explanation:
          'Cancellation terms vary by service type and timing. Applicable charges and refund expectations are shown before cancellation confirmation and recorded in booking history.',
      },
      {
        icon: 'star',
        title: 'How to rate a trip',
        color: '#FF9800',
        category: 'Ratings',
        explanation:
          'After ride completion, submit a star rating and optional review from the trip summary or history screen. Constructive ratings help improve reliability and user trust.',
      },
      {
        icon: 'shield',
        title: 'Document verification process',
        color: '#4CAF50',
        category: 'Account',
        explanation:
          'Upload clear, valid documents from profile settings. Verification generally completes within 24-48 hours. If rejected, you can re-upload corrected documents with readable details.',
      },
      {
        icon: 'credit_card',
        title: 'Wallet & Forlok coins',
        color: '#00BCD4',
        category: 'Wallet',
        explanation:
          'Wallet and coin flows are shown in-app for eligible rides, discounts, and adjustments. You can review transaction entries in wallet history for transparency.',
      },
      {
        icon: 'car',
        title: 'How driver tracking works',
        color: '#607D8B',
        category: 'Tracking',
        explanation:
          'During active rides, real-time tracking shows route progress and ETA. Tracking events help users coordinate pickups, improve safety visibility, and confirm timely trip completion.',
      },
    ],
    contactOptions: [
      { icon: 'message_circle', label: 'Live Chat', desc: 'Chat with our support team', color: '#4CAF50', actionType: 'url', actionValue: '' },
      { icon: 'phone', label: 'Call Us', desc: 'Toll-free: 1800-XXX-XXXX', color: '#F99E3C', actionType: 'tel', actionValue: 'tel:+911800XXXXXXX' },
      { icon: 'mail', label: 'Email Support', desc: 'support@forlok.com', color: '#FF9800', actionType: 'mailto', actionValue: 'mailto:support@forlok.com' },
    ],
  },
} as const;

export const cloneContentDefault = (key: keyof typeof CONTENT_DEFAULTS) =>
  JSON.parse(JSON.stringify(CONTENT_DEFAULTS[key]));

