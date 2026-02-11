# YAARYATRA MVP Validation Survey - Google Form Structure (Semi-English & Telugu)

## Form Settings
- **Form Title**: YAARYATRA MVP Validation Survey
- **Form Description**: YAARYATRA launch కి ముందు validate చేయడానికి మాకు సహాయం చేయండి! ఈ survey driver/offerer లేదా passenger/user గా మీ needs ని అర్థం చేసుకోవడానికి సహాయపడుతుంది.
- **Admin Email**: n210438@rguktn.ac.in
- **Response Collection**: Enabled
- **Response Limit**: None (లేదా అవసరమైనప్పుడు set చేయండి)
- **Collect Email Addresses**: Optional (beta tester signup కోసం)

---

## SECTION 1: INTRODUCTION & MVP REVIEW

### Question 1: MVP Review Confirmation
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- అవును, నేను MVP demo చూశాను
- లేదు, నేను ఇంకా చూడలేదు
- Survey సమయంలో review చేస్తాను

### Question 2: MVP Link & Confirmation
**Type**: Text (Paragraph)
**Required**: Yes
**Description**: 
```
దయచేసి ముందుకు వెళ్లడానికి ముందు మా MVP demonstration review చేయండి:

[INSERT MVP LINK HERE - Video/Prototype/Screenshots]

Review చేసిన తర్వాత, మీరు దాన్ని చూశారని confirm చేయండి.
```

**Follow-up Question 2a**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- నేను MVP review చేశాను
- Review కోసం ఇంకా సమయం కావాలి

**Conditional Logic**: Question 2 answer "Review కోసం ఇంకా సమయం కావాలి" కాకపోతే మాత్రమే show చేయండి

---

## SECTION 2: ROLE IDENTIFICATION

### Question 3: Primary Role Interest
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- DRIVER/OFFERER - నేను pooling rides offer చేయాలనుకుంటున్నాను లేదా నా vehicle rent out చేయాలనుకుంటున్నాను
- PASSENGER/USER - నేను rides join చేయాలనుకుంటున్నాను లేదా vehicles rent చేయాలనుకుంటున్నాను
- BOTH - నేను రెండు roles లో interest కలిగి ఉన్నాను
- NOT SURE YET

**Conditional Logic**: 
- "DRIVER/OFFERER" అయితే → Part A questions show చేయండి
- "PASSENGER/USER" అయితే → Part B questions show చేయండి
- "BOTH" అయితే → Part A + Part B questions show చేయండి
- "NOT SURE YET" అయితే → Part A + Part B questions show చేయండి

---

## SECTION 3: DEMOGRAPHICS (ALL USERS)

### Question 4: Age Range
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- 18-25
- 26-35
- 36-45
- 46-55
- 55+

### Question 5: Location
**Type**: Short Answer Text
**Required**: Yes
**Question**: మీరు ప్రధానంగా ఏ state/city లో నివసిస్తున్నారు?

### Question 6: Travel Frequency
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- Daily
- వారానికి 2-3 సార్లు
- వారానికి ఒకసారి
- నెలకు 2-3 సార్లు
- నెలకు ఒకసారి
- అరుదుగా (సంవత్సరానికి కొన్ని సార్లు)

### Question 7: Vehicle Ownership
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- అవును, Car
- అవును, Bike
- అవును, Both
- లేదు

**Conditional Logic**: 
- "Yes, Car" లేదా "Yes, Both" అయితే → Part A లో car-related questions show చేయండి
- "Yes, Bike" లేదా "Yes, Both" అయితే → Part A లో bike-related questions show చేయండి
- "No" అయితే → Part A లో vehicle owner questions hide చేయండి

---

## PART A: DRIVER/OFFERER QUESTIONS

**Conditional Logic**: Question 3 = "DRIVER/OFFERER" లేదా "BOTH" లేదా "NOT SURE YET" అయితే మాత్రమే show చేయండి

### Section A1: Driver Context

#### Question A1: Driver Travel Frequency
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- Daily
- వారానికి 2-3 సార్లు
- వారానికి ఒకసారి
- నెలకు 2-3 సార్లు
- నెలకు ఒకసారి
- అరుదుగా

#### Question A2: Average Trip Distance
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- 100 km కంటే తక్కువ
- 100-300 km
- 300-500 km
- 500-1000 km
- 1000 km కంటే ఎక్కువ

#### Question A3: Vehicle Usage
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- Daily (vehicle తరచుగా unused గా ఉంటుంది)
- వారానికి అనేక సార్లు
- వారానికి ఒకసారి
- అరుదుగా (vehicle చాలా సమయం use అవుతుంది)
- ఎప్పుడూ (ఎల్లప్పుడూ use లో ఉంటుంది)

**Conditional Logic**: Question 7 = "Yes, Car" లేదా "Yes, Bike" లేదా "Yes, Both" అయితే మాత్రమే show చేయండి

---

### Section A2: Pooling Willingness (Driver)

#### Question A4: Willingness to Share Ride
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- చాలా willing - నేను regular గా చేస్తాను
- Willing - నేను try చేస్తాను
- Neutral - పరిస్థితి మీద depend అవుతుంది
- Unwilling - comfortable కాదు
- చాలా unwilling - ఎప్పుడూ కాదు

#### Question A5: Motivation for Pooling
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- అదనపు income సంపాదించడం
- travel costs తగ్గించడం
- trips ని మరింత social గా చేయడం
- ఇతరులకు సహాయం చేయడం
- పర్యావరణ ప్రయోజనాలు
- Other: [Text input]

#### Question A6: Main Concerns (Pooling)
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- strangers తో safety
- Passenger behavior
- Vehicle damage/cleanliness
- Punctuality issues
- Payment collection
- Route flexibility
- Privacy
- Legal/insurance issues
- Other: [Text input]
- ప్రధాన concerns లేవు

#### Question A7: Comfortable Passenger Count
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- 1 passenger మాత్రమే
- 2 passengers
- 3 passengers
- Maximum capacity (car కి 4, bike కి 1)
- పరిస్థితి మీద depend అవుతుంది

**Conditional Logic**: 
- Question 7 = "Yes, Bike" అయితే → "3 passengers" మరియు "Maximum capacity (4 for car, 1 for bike)" hide చేయండి → "Maximum capacity (1 for bike)" show చేయండి
- Question 7 = "Yes, Car" లేదా "Yes, Both" అయితే → అన్ని options show చేయండి

#### Question A8: Passenger Preferences
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Verified documents (Aadhar)
- High ratings (4+ stars)
- Many reviews (10+)
- Same gender
- Same city/region
- trip ముందు chat చేయగలగడం
- specific preferences లేవు
- Other: [Text input]

#### Question A9: Pricing Preference
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- మీరే person కి price set చేయడం
- app-suggested pricing use చేయడం
- distance ఆధారంగా fixed pricing
- passengers తో negotiate చేయడం
- Other: [Text input]

#### Question A10: Cost Recovery Expectation
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- 20-30%
- 30-50%
- 50-70%
- 70-100%
- 100% కంటే ఎక్కువ (profit)
- తెలియదు

---

### Section A3: Rental Willingness (Driver)

#### Question A11: Willingness to Rent Out Vehicle
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- చాలా willing - నేను regular గా చేస్తాను
- Willing - నేను try చేస్తాను
- Neutral - ఇంకా information కావాలి
- Unwilling - comfortable కాదు
- చాలా unwilling - ఎప్పుడూ కాదు

**Conditional Logic**: Question 7 = "Yes, Car" లేదా "Yes, Bike" లేదా "Yes, Both" అయితే మాత్రమే show చేయండి

#### Question A12: Motivation for Rental
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- passive income సంపాదించడం
- vehicle maintenance costs cover చేయడం
- vehicle తరచుగా unused గా ఉంటుంది
- అదనపు revenue stream
- Other: [Text input]

**Conditional Logic**: Question A11 ≠ "చాలా unwilling - ఎప్పుడూ కాదు" అయితే మాత్రమే show చేయండి

#### Question A13: Main Concerns (Rental)
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Vehicle damage/accidents
- Theft
- Customer reliability
- Insurance coverage
- Payment collection
- Maintenance issues
- Legal liability
- Vehicle misuse
- Other: [Text input]
- ప్రధాన concerns లేవు

**Conditional Logic**: Question A11 ≠ "చాలా unwilling - ఎప్పుడూ కాదు" అయితే మాత్రమే show చేయండి

#### Question A14: Preferred Rental Duration
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- కొన్ని గంటలు (2-6 hours)
- Half day (6-12 hours)
- Full day (12-24 hours)
- Multiple days
- ఏ duration అయినా
- vehicle type మీద depend అవుతుంది

**Conditional Logic**: Question A11 ≠ "చాలా unwilling - ఎప్పుడూ కాదు" అయితే మాత్రమే show చేయండి

#### Question A15: Expected Car Rental Price
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే మరియు Question 7 = "Yes, Car" లేదా "Yes, Both")
**Options**:
- ₹200 - ₹400/hour
- ₹400 - ₹600/hour
- ₹600 - ₹800/hour
- ₹800 - ₹1,000/hour
- ₹1,000/hour కంటే ఎక్కువ
- vehicle model మీద depend అవుతుంది

**Conditional Logic**: Question 7 = "Yes, Car" లేదా "Yes, Both" అయితే మాత్రమే show చేయండి

#### Question A16: Expected Bike Rental Price
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే మరియు Question 7 = "Yes, Bike" లేదా "Yes, Both")
**Options**:
- ₹100 - ₹200/hour
- ₹200 - ₹300/hour
- ₹300 - ₹400/hour
- ₹400 - ₹500/hour
- ₹500/hour కంటే ఎక్కువ
- bike model మీద depend అవుతుంది

**Conditional Logic**: Question 7 = "Yes, Bike" లేదా "Yes, Both" అయితే మాత్రమే show చేయండి

---

### Section A4: Driver MVP Feature Feedback

#### Question A17: Create Pooling Offer Ease
**Type**: Scale (1-5)
**Required**: Yes (Part A show అయితే)
**Labels**: 
- 1 = చాలా కష్టం
- 5 = చాలా సులభం

#### Question A18: Create Rental Offer Ease
**Type**: Scale (1-5)
**Required**: Yes (Part A show అయితే)
**Labels**: 
- 1 = చాలా కష్టం
- 5 = చాలా సులభం

#### Question A19: Needed Passenger/Renter Information
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Name and photo
- Rating and reviews
- Number of previous trips
- Verification status
- Response time
- Cancellation history
- Payment history
- Other: [Text input]

#### Question A20: Booking Management Importance
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- చాలా important
- Very important
- మధ్యస్థంగా important
- చాలా important కాదు
- Important కాదు

#### Question A21: Required Driver Features
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Easy booking management dashboard
- Payment tracking and settlement
- Customer verification system
- Analytics and earnings reports
- Multiple vehicle management
- Calendar view for availability
- Auto-pricing suggestions
- Customer communication (chat)
- Other: [Text input]

#### Question A22: Payment Preference
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Direct to bank account
- UPI
- Digital wallet
- Cash (offline)
- Weekly settlement
- Monthly settlement
- Other: [Text input]

#### Question A23: Real-time Tracking Importance
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- చాలా important
- Very important
- మధ్యస్థంగా important
- చాలా important కాదు
- Important కాదు

---

### Section A5: Driver Safety & Trust

#### Question A24: Safety Features Needed
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Passenger/renter document verification
- Background checks
- Insurance coverage
- Emergency support
- Rating system
- trip ముందు In-app chat
- 24/7 customer support
- Dispute resolution system
- Other: [Text input]

#### Question A25: Handling Problematic Users
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Booking cancel చేయడం
- Support contact చేయడం
- వారిని poorly rate చేయడం
- వారిని block చేయడం
- పైన ఉన్నవన్నీ
- Other: [Text input]

#### Question A26: Ability to Reject Bookings
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- అవును, ఎల్లప్పుడూ
- అవును, valid reason తో
- లేదు, అన్ని accept చేయడం
- తెలియదు

---

### Section A6: Driver Business & Earnings

#### Question A27: Expected Monthly Income (Pooling)
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- ₹2,000 కంటే తక్కువ
- ₹2,000 - ₹5,000
- ₹5,000 - ₹10,000
- ₹10,000 - ₹20,000
- ₹20,000 కంటే ఎక్కువ
- తెలియదు

#### Question A28: Expected Monthly Income (Rental)
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- ₹5,000 కంటే తక్కువ
- ₹5,000 - ₹10,000
- ₹10,000 - ₹20,000
- ₹20,000 - ₹50,000
- ₹50,000 కంటే ఎక్కువ
- తెలియదు

#### Question A29: Acceptable Platform Fee
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- 0-5%
- 5-10%
- 10-15%
- 15-20%
- 20% కంటే ఎక్కువ
- service quality మీద depend అవుతుంది

#### Question A30: Willingness to Pay for Premium Features
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- అవును, definitely
- అవును, price reasonable అయితే
- Maybe
- లేదు
- తెలియదు

---

### Section A7: Driver Adoption

#### Question A31: Likelihood to Offer Services
**Type**: Multiple Choice (Single)
**Required**: Yes (Part A show అయితే)
**Options**:
- చాలా likely
- Likely
- Neutral
- Unlikely
- చాలా unlikely

#### Question A32: Barriers to Offering Services
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Safety concerns
- తగినంత demand లేదు
- తక్కువ earnings potential
- Complex process
- Trust issues
- Insurance concerns
- Legal concerns
- Other: [Text input]
- ఏమీ లేదు - నేను definitely offer చేస్తాను

#### Question A33: Factors Increasing Likelihood
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Launch bonuses/incentives
- Guaranteed minimum earnings
- Insurance coverage
- Easy onboarding
- Good customer support
- నా area లో high demand
- competitors కంటే better pricing
- Other: [Text input]

---

## PART B: PASSENGER/USER QUESTIONS

**Conditional Logic**: Question 3 = "PASSENGER/USER" లేదా "BOTH" లేదా "NOT SURE YET" అయితే మాత్రమే show చేయండి

### Section B1: Passenger Context

#### Question B1: Passenger Travel Frequency
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- Daily
- వారానికి 2-3 సార్లు
- వారానికి ఒకసారి
- నెలకు 2-3 సార్లు
- నెలకు ఒకసారి
- అరుదుగా

#### Question B2: Average Trip Distance (Passenger)
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- 100 km కంటే తక్కువ
- 100-300 km
- 300-500 km
- 500-1000 km
- 1000 km కంటే ఎక్కువ

#### Question B3: Current Primary Travel Mode
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- Private car (own)
- Public bus
- Train
- Flight
- Taxi/Cab (Ola/Uber)
- Bike
- Other: [Text input]

#### Question B4: Typical Travel Spending
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- ₹500 కంటే తక్కువ
- ₹500 - ₹1,000
- ₹1,000 - ₹2,500
- ₹2,500 - ₹5,000
- ₹5,000 కంటే ఎక్కువ

---

### Section B2: Passenger Pooling Willingness

#### Question B5: Willingness to Join Rides
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- చాలా willing - నేను regular గా చేస్తాను
- Willing - నేను try చేస్తాను
- Neutral - పరిస్థితి మీద depend అవుతుంది
- Unwilling - comfortable కాదు
- చాలా unwilling - ఎప్పుడూ కాదు

#### Question B6: Motivation for Pooling
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- గణనీయమైన cost savings (30%+)
- Convenience
- పర్యావరణ ప్రయోజనాలు
- Social aspect
- Flexibility
- Other: [Text input]

#### Question B7: Main Concerns (Joining Rides)
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- strangers తో safety
- Driver behavior
- Vehicle condition
- Punctuality
- Route flexibility
- Privacy
- Payment issues
- Cancellation problems
- Other: [Text input]
- ప్రధాన concerns లేవు

#### Question B8: Driver Preferences
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Verified documents (Aadhar, License)
- High ratings (4+ stars)
- Many reviews (10+)
- Same gender
- Same city/region
- trip ముందు chat చేయగలగడం
- Vehicle photos
- specific preferences లేవు
- Other: [Text input]

#### Question B9: Comfortable Passenger Count
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- నేను మాత్రమే (1 passenger total)
- 1-2 other passengers
- 3 other passengers
- Maximum capacity
- పట్టింపు లేదు

#### Question B10: Required Cost Savings
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- 20-30% savings
- 30-40% savings
- 40-50% savings
- 50%+ savings
- Cost savings important కాదు
- Other: [Text input]

#### Question B11: Reasonable Pooling Price (300km)
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- ₹200 - ₹400
- ₹400 - ₹600
- ₹600 - ₹800
- ₹800 - ₹1,000
- ₹1,000 కంటే ఎక్కువ
- vehicle type మీద depend అవుతుంది

---

### Section B3: Passenger Rental Willingness

#### Question B12: Willingness to Rent Vehicle
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- చాలా willing
- Willing
- Neutral
- Unwilling
- చాలా unwilling

#### Question B13: Motivation for Rental
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Convenience
- taxi కంటే Cost savings
- Flexibility
- Privacy
- specific duration కావాలి
- Other: [Text input]

#### Question B14: Main Concerns (Rental)
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Vehicle condition
- Insurance coverage
- Damage liability
- Owner reliability
- Pricing
- Payment security
- Vehicle breakdown
- Other: [Text input]
- ప్రధాన concerns లేవు

#### Question B15: Typical Rental Duration Needed
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- కొన్ని గంటలు (2-6 hours)
- Half day (6-12 hours)
- Full day (12-24 hours)
- Multiple days
- Varies

#### Question B16: Reasonable Car Rental Price
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- ₹200 - ₹400/hour
- ₹400 - ₹600/hour
- ₹600 - ₹800/hour
- ₹800 - ₹1,000/hour
- ₹1,000/hour కంటే ఎక్కువ
- vehicle type మీద depend అవుతుంది

#### Question B17: Reasonable Bike Rental Price
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- ₹100 - ₹200/hour
- ₹200 - ₹300/hour
- ₹300 - ₹400/hour
- ₹400 - ₹500/hour
- ₹500/hour కంటే ఎక్కువ
- bike type మీద depend అవుతుంది

---

### Section B4: Passenger MVP Feature Feedback

#### Question B18: Search Pooling Ease
**Type**: Scale (1-5)
**Required**: Yes (Part B show అయితే)
**Labels**: 
- 1 = చాలా కష్టం
- 5 = చాలా సులభం

#### Question B19: Search Rental Ease
**Type**: Scale (1-5)
**Required**: Yes (Part B show అయితే)
**Labels**: 
- 1 = చాలా కష్టం
- 5 = చాలా సులభం

#### Question B20: Needed Booking Information
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Driver/owner name and photo
- Rating and reviews
- Vehicle details and photos
- Number of previous trips
- Response time
- Cancellation rate
- Route details
- Price breakdown
- Other: [Text input]

#### Question B21: Real-time Tracking Importance
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- చాలా important
- Very important
- మధ్యస్థంగా important
- చాలా important కాదు
- Important కాదు

#### Question B22: Food Booking Feature Usefulness
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- చాలా useful - నేను తరచుగా use చేస్తాను
- Useful - నేను కొన్నిసార్లు use చేస్తాను
- Neutral
- చాలా useful కాదు
- Useful కాదు

---

### Section B5: Passenger Safety & Trust

#### Question B23: Safety Features Needed
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Verified driver/owner documents
- User ratings and reviews
- family తో Real-time location sharing
- Emergency contact button
- trip ముందు In-app chat
- Insurance coverage
- 24/7 customer support
- Background verification
- Other: [Text input]

#### Question B24: Share Trip Details with Family
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- అవును, ఎల్లప్పుడూ
- అవును, కొన్నిసార్లు
- లేదు, నేను privacy prefer చేస్తాను
- తెలియదు

#### Question B25: Rating Importance
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- చాలా important
- Very important
- మధ్యస్థంగా important
- చాలా important కాదు
- Important కాదు

#### Question B26: Handling Bad Experience
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- వారిని poorly rate చేయడం
- Review రాయడం
- Support contact చేయడం
- Issue report చేయడం
- User ని block చేయడం
- పైన ఉన్నవన్నీ
- Other: [Text input]

---

### Section B6: Passenger Payment & Pricing

#### Question B27: Payment Method Preference
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- UPI (Google Pay, PhonePe)
- Credit/Debit Card
- Digital Wallet
- Net Banking
- Cash (offline)
- Other: [Text input]

#### Question B28: Platform Fee Willingness
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- అవును, service good అయితే
- Maybe, amount మీద depend అవుతుంది
- లేదు, నేను fees prefer చేయను
- తెలియదు

#### Question B29: Cancellation Policy Importance
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- చాలా important
- Very important
- మధ్యస్థంగా important
- చాలా important కాదు
- Important కాదు

---

### Section B7: Passenger Adoption

#### Question B30: Likelihood to Use YAARYATRA
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- చాలా likely
- Likely
- Neutral
- Unlikely
- చాలా unlikely

#### Question B31: Barriers to Using YAARYATRA
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Safety concerns
- తగినంత drivers/vehicles లేవు
- existing options prefer చేయడం
- Complex interface
- High prices
- నా area లో limited availability
- Trust issues
- Other: [Text input]
- ఏమీ లేదు - నేను definitely use చేస్తాను

#### Question B32: Factors Increasing Likelihood
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Launch discounts/offers
- Referral bonuses
- నా area లో more drivers/vehicles
- Better safety features
- Lower prices
- Better user reviews
- Insurance coverage
- Other: [Text input]

#### Question B33: Recommendation Likelihood
**Type**: Multiple Choice (Single)
**Required**: Yes (Part B show అయితే)
**Options**:
- అవును, definitely
- Probably
- Maybe
- Probably not
- Definitely not

---

## PART C: COMMON QUESTIONS (ALL USERS)

### Section C1: MVP Overall Feedback

#### Question C1: First Impression
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- చాలా positive - నేను excited గా ఉన్నాను use చేయడానికి
- Positive - promising గా కనిపిస్తోంది
- Neutral - ఇంకా చూడాలి
- Negative - concerns ఉన్నాయి
- చాలా negative - interest లేదు

#### Question C2: Purpose Clarity
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- చాలా clear
- Clear
- కొంత clear
- Unclear
- చాలా unclear

#### Question C3: Interface Intuitiveness
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- చాలా intuitive - అర్థం చేసుకోవడం easy
- Intuitive - చాలావరకు clear
- Neutral
- Confusing - improvement కావాలి
- చాలా confusing

#### Question C4: Confusing Screens
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Registration screens
- Main Dashboard
- Create Offer screens
- Search screens
- Booking screens
- Payment screens
- Profile screens
- ఏమీ లేదు - అన్నీ clear
- Other: [Text input]

---

### Section C2: Final Validation

#### Question C5: Problem-Solution Fit
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- అవును, definitely
- అవును, కొంత
- Neutral
- లేదు, really కాదు
- లేదు, definitely కాదు

#### Question C6: Problem Solved
**Type**: Paragraph Text
**Required**: No
**Question**: YAARYATRA మీకు ఏ problem solve చేస్తుంది?

#### Question C7: Biggest Risk/Concern
**Type**: Paragraph Text
**Required**: No
**Question**: YAARYATRA గురించి మీకు ఉన్న BIGGEST RISK లేదా CONCERN ఏమిటి?

#### Question C8: Additional Feedback
**Type**: Paragraph Text
**Required**: No
**Question**: ఏదైనా additional feedback లేదా suggestions ఉన్నాయా?

#### Question C9: Beta Tester Interest
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- అవును, definitely
- అవును, maybe
- లేదు, thank you

#### Question C10: Contact Information
**Type**: Short Answer Text
**Required**: No (C9 = "అవును, definitely" లేదా "అవును, maybe" అయితే Yes)
**Question**: అవును అయితే, దయచేసి మీ contact information provide చేయండి (Phone/Email)

**Conditional Logic**: Question C9 = "అవును, definitely" లేదా "అవును, maybe" అయితే మాత్రమే show చేయండి

---

## CONDITIONAL LOGIC SUMMARY

### Main Routing (Question 3):
- **DRIVER/OFFERER** → Part A మాత్రమే show చేయండి
- **PASSENGER/USER** → Part B మాత్రమే show చేయండి
- **BOTH** → Part A + Part B show చేయండి
- **NOT SURE YET** → Part A + Part B show చేయండి

### Vehicle Ownership (Question 7):
- **Yes, Car** → car-related questions show చేయండి
- **Yes, Bike** → bike-related questions show చేయండి
- **Yes, Both** → car మరియు bike questions రెండూ show చేయండి
- **No** → Part A లో vehicle owner questions hide చేయండి

### Nested Conditionals:
- Question A11 (Rental Willingness) → "చాలా unwilling - ఎప్పుడూ కాదు" అయితే → rental-related questions hide చేయండి
- Question A15/A16 → vehicle type ఆధారంగా show చేయండి
- Question C10 → C9 = "అవును" అయితే మాత్రమే show చేయండి

---

## FORM SETUP INSTRUCTIONS

### Step 1: Create New Google Form
1. Google Forms (forms.google.com) కి వెళ్లండి
2. "+" click చేసి new form create చేయండి
3. Title set చేయండి: "YAARYATRA MVP Validation Survey"
4. Survey purpose explain చేసే description add చేయండి

### Step 2: Configure Settings
1. Settings (gear icon) click చేయండి
2. "Collect email addresses" enable చేయండి (optional)
3. "Limit to 1 response" enable చేయండి (అవసరమైతే)
4. "Send responders a copy of their response" set చేయండి (optional)

### Step 3: Add Questions
పైన ఉన్న structure follow చేసి, ప్రతి question ని order లో add చేయండి.

### Step 4: Set Up Conditional Logic
1. Conditional logic ఉన్న ప్రతి question కి, three dots menu click చేయండి
2. "Go to section based on answer" select చేయండి
3. specified logic ఆధారంగా routing configure చేయండి

### Step 5: Organize Sections
Sections create చేయండి:
- Section 1: Introduction
- Section 2: Demographics
- Part A: Driver Questions (applicable అయితే)
- Part B: Passenger Questions (applicable అయితే)
- Part C: Common Questions

### Step 6: Customize Appearance
1. Theme (palette icon) click చేయండి
2. appropriate colors/branding choose చేయండి
3. YAARYATRA logo add చేయండి (available అయితే)

### Step 7: Share Form
1. "Send" button click చేయండి
2. Form link copy చేయండి
3. Target audience తో share చేయండి

### Step 8: Set Admin Access
1. Three dots menu → Settings
2. Collaborator add చేయండి: n210438@rguktn.ac.in
3. "Editor" లేదా "Owner" గా set చేయండి

---

## RESPONSE ANALYSIS PRIORITIES

### Key Metrics to Track:
1. **Driver Willingness**: Questions A4, A11, A31
2. **Passenger Willingness**: Questions B5, B12, B30
3. **Main Concerns**: Questions A6, A13, B7, B14
4. **Pricing Expectations**: Questions A15, A16, B11, B16, B17
5. **Adoption Likelihood**: Questions A31, B30
6. **MVP Feedback**: Questions C1, C2, C3

### Analysis Questions:
- Drivers లో ఎంత % willing గా ఉన్నారు share rides?
- Passengers లో ఎంత % willing గా ఉన్నారు join rides?
- ప్రతి group కి top 3 concerns ఏమిటి?
- Acceptable price ranges ఏమిటి?
- Most important features ఏమిటి?
- Adoption increase చేయడానికి ఏమి కావాలి?

---

## NOTES

- Total Questions: ~83 (user "BOTH" select చేస్తే)
- Estimated Time: 15-20 minutes
- Google Forms లో conditional logic setup చేయాలి
- Sharing ముందు form ని thoroughly test చేయండి
- Progress indicator add చేయడం consider చేయండి
- చాలా పొడవుగా ఉంటే multiple forms గా split చేయవచ్చు
