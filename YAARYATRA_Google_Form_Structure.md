# YAARYATRA MVP Validation Survey - Google Form Structure

## Form Settings
- **Form Title**: YAARYATRA MVP Validation Survey
- **Form Description**: Help us validate YAARYATRA before launch! This survey helps us understand your needs as a driver/offerer or passenger/user.
- **Admin Email**: n210438@rguktn.ac.in
- **Response Collection**: Enabled
- **Response Limit**: None (or set as needed)
- **Collect Email Addresses**: Optional (for beta tester signup)

---

## SECTION 1: INTRODUCTION & MVP REVIEW

### Question 1: MVP Review Confirmation
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- Yes, I've seen the MVP demo
- No, I haven't seen it yet
- I'll review it during the survey

### Question 2: MVP Link & Confirmation
**Type**: Text (Paragraph)
**Required**: Yes
**Description**: 
```
Please review our MVP demonstration before proceeding:

[INSERT MVP LINK HERE - Video/Prototype/Screenshots]

After reviewing, please confirm you have seen it.
```

**Follow-up Question 2a**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- I have reviewed the MVP
- I need more time to review

**Conditional Logic**: Show only if Question 2 answer is NOT "I need more time to review"

---

## SECTION 2: ROLE IDENTIFICATION

### Question 3: Primary Role Interest
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- DRIVER/OFFERER - I want to offer pooling rides or rent out my vehicle
- PASSENGER/USER - I want to join rides or rent vehicles
- BOTH - I'm interested in both roles
- NOT SURE YET

**Conditional Logic**: 
- If "DRIVER/OFFERER" → Show Part A questions
- If "PASSENGER/USER" → Show Part B questions
- If "BOTH" → Show Part A + Part B questions
- If "NOT SURE YET" → Show Part A + Part B questions

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
**Question**: Which state/city do you primarily reside in?

### Question 6: Travel Frequency
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- Daily
- 2-3 times per week
- Once a week
- 2-3 times per month
- Once a month
- Rarely (few times a year)

### Question 7: Vehicle Ownership
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- Yes, Car
- Yes, Bike
- Yes, Both
- No

**Conditional Logic**: 
- If "Yes, Car" or "Yes, Both" → Show car-related questions in Part A
- If "Yes, Bike" or "Yes, Both" → Show bike-related questions in Part A
- If "No" → Hide vehicle owner questions in Part A

---

## PART A: DRIVER/OFFERER QUESTIONS

**Conditional Logic**: Show only if Question 3 = "DRIVER/OFFERER" or "BOTH" or "NOT SURE YET"

### Section A1: Driver Context

#### Question A1: Driver Travel Frequency
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Daily
- 2-3 times per week
- Once a week
- 2-3 times per month
- Once a month
- Rarely

#### Question A2: Average Trip Distance
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Less than 100 km
- 100-300 km
- 300-500 km
- 500-1000 km
- More than 1000 km

#### Question A3: Vehicle Usage
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Daily (vehicle sits unused often)
- Several times per week
- Once a week
- Rarely (vehicle is used most of the time)
- Never (always in use)

**Conditional Logic**: Show only if Question 7 = "Yes, Car" or "Yes, Bike" or "Yes, Both"

---

### Section A2: Pooling Willingness (Driver)

#### Question A4: Willingness to Share Ride
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Very willing - I'd do it regularly
- Willing - I'd try it
- Neutral - Depends on the situation
- Unwilling - Not comfortable
- Very unwilling - Never

#### Question A5: Motivation for Pooling
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Earn extra income
- Reduce travel costs
- Make trips more social
- Help others
- Environmental benefits
- Other: [Text input]

#### Question A6: Main Concerns (Pooling)
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Safety with strangers
- Passenger behavior
- Vehicle damage/cleanliness
- Punctuality issues
- Payment collection
- Route flexibility
- Privacy
- Legal/insurance issues
- Other: [Text input]
- No major concerns

#### Question A7: Comfortable Passenger Count
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- 1 passenger only
- 2 passengers
- 3 passengers
- Maximum capacity (4 for car, 1 for bike)
- Depends on the situation

**Conditional Logic**: 
- If Question 7 = "Yes, Bike" → Hide "3 passengers" and "Maximum capacity (4 for car, 1 for bike)" → Show "Maximum capacity (1 for bike)"
- If Question 7 = "Yes, Car" or "Yes, Both" → Show all options

#### Question A8: Passenger Preferences
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Verified documents (Aadhar)
- High ratings (4+ stars)
- Many reviews (10+)
- Same gender
- Same city/region
- Can chat before trip
- No specific preferences
- Other: [Text input]

#### Question A9: Pricing Preference
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Set your own price per person
- Use app-suggested pricing
- Fixed pricing based on distance
- Negotiate with passengers
- Other: [Text input]

#### Question A10: Cost Recovery Expectation
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- 20-30%
- 30-50%
- 50-70%
- 70-100%
- More than 100% (profit)
- Not sure

---

### Section A3: Rental Willingness (Driver)

#### Question A11: Willingness to Rent Out Vehicle
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Very willing - I'd do it regularly
- Willing - I'd try it
- Neutral - Need more info
- Unwilling - Not comfortable
- Very unwilling - Never

**Conditional Logic**: Show only if Question 7 = "Yes, Car" or "Yes, Bike" or "Yes, Both"

#### Question A12: Motivation for Rental
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Earn passive income
- Cover vehicle maintenance costs
- Vehicle sits unused often
- Additional revenue stream
- Other: [Text input]

**Conditional Logic**: Show only if Question A11 ≠ "Very unwilling - Never"

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
- No major concerns

**Conditional Logic**: Show only if Question A11 ≠ "Very unwilling - Never"

#### Question A14: Preferred Rental Duration
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Few hours (2-6 hours)
- Half day (6-12 hours)
- Full day (12-24 hours)
- Multiple days
- Any duration
- Depends on vehicle type

**Conditional Logic**: Show only if Question A11 ≠ "Very unwilling - Never"

#### Question A15: Expected Car Rental Price
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown and Question 7 = "Yes, Car" or "Yes, Both")
**Options**:
- ₹200 - ₹400/hour
- ₹400 - ₹600/hour
- ₹600 - ₹800/hour
- ₹800 - ₹1,000/hour
- More than ₹1,000/hour
- Depends on vehicle model

**Conditional Logic**: Show only if Question 7 = "Yes, Car" or "Yes, Both"

#### Question A16: Expected Bike Rental Price
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown and Question 7 = "Yes, Bike" or "Yes, Both")
**Options**:
- ₹100 - ₹200/hour
- ₹200 - ₹300/hour
- ₹300 - ₹400/hour
- ₹400 - ₹500/hour
- More than ₹500/hour
- Depends on bike model

**Conditional Logic**: Show only if Question 7 = "Yes, Bike" or "Yes, Both"

---

### Section A4: Driver MVP Feature Feedback

#### Question A17: Create Pooling Offer Ease
**Type**: Scale (1-5)
**Required**: Yes (if Part A shown)
**Labels**: 
- 1 = Very difficult
- 5 = Very easy

#### Question A18: Create Rental Offer Ease
**Type**: Scale (1-5)
**Required**: Yes (if Part A shown)
**Labels**: 
- 1 = Very difficult
- 5 = Very easy

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
**Required**: Yes (if Part A shown)
**Options**:
- Extremely important
- Very important
- Moderately important
- Not very important
- Not important

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
**Required**: Yes (if Part A shown)
**Options**:
- Extremely important
- Very important
- Moderately important
- Not very important
- Not important

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
- In-app chat before trip
- 24/7 customer support
- Dispute resolution system
- Other: [Text input]

#### Question A25: Handling Problematic Users
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Cancel the booking
- Contact support
- Rate them poorly
- Block them
- All of the above
- Other: [Text input]

#### Question A26: Ability to Reject Bookings
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Yes, always
- Yes, with valid reason
- No, accept all
- Not sure

---

### Section A6: Driver Business & Earnings

#### Question A27: Expected Monthly Income (Pooling)
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Less than ₹2,000
- ₹2,000 - ₹5,000
- ₹5,000 - ₹10,000
- ₹10,000 - ₹20,000
- More than ₹20,000
- Not sure

#### Question A28: Expected Monthly Income (Rental)
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Less than ₹5,000
- ₹5,000 - ₹10,000
- ₹10,000 - ₹20,000
- ₹20,000 - ₹50,000
- More than ₹50,000
- Not sure

#### Question A29: Acceptable Platform Fee
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- 0-5%
- 5-10%
- 10-15%
- 15-20%
- More than 20%
- Depends on service quality

#### Question A30: Willingness to Pay for Premium Features
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Yes, definitely
- Yes, if price is reasonable
- Maybe
- No
- Not sure

---

### Section A7: Driver Adoption

#### Question A31: Likelihood to Offer Services
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part A shown)
**Options**:
- Very likely
- Likely
- Neutral
- Unlikely
- Very unlikely

#### Question A32: Barriers to Offering Services
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Safety concerns
- Not enough demand
- Low earnings potential
- Complex process
- Trust issues
- Insurance concerns
- Legal concerns
- Other: [Text input]
- Nothing - I'll definitely offer

#### Question A33: Factors Increasing Likelihood
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Launch bonuses/incentives
- Guaranteed minimum earnings
- Insurance coverage
- Easy onboarding
- Good customer support
- High demand in my area
- Better pricing than competitors
- Other: [Text input]

---

## PART B: PASSENGER/USER QUESTIONS

**Conditional Logic**: Show only if Question 3 = "PASSENGER/USER" or "BOTH" or "NOT SURE YET"

### Section B1: Passenger Context

#### Question B1: Passenger Travel Frequency
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Daily
- 2-3 times per week
- Once a week
- 2-3 times per month
- Once a month
- Rarely

#### Question B2: Average Trip Distance (Passenger)
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Less than 100 km
- 100-300 km
- 300-500 km
- 500-1000 km
- More than 1000 km

#### Question B3: Current Primary Travel Mode
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
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
**Required**: Yes (if Part B shown)
**Options**:
- Less than ₹500
- ₹500 - ₹1,000
- ₹1,000 - ₹2,500
- ₹2,500 - ₹5,000
- More than ₹5,000

---

### Section B2: Passenger Pooling Willingness

#### Question B5: Willingness to Join Rides
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Very willing - I'd do it regularly
- Willing - I'd try it
- Neutral - Depends on the situation
- Unwilling - Not comfortable
- Very unwilling - Never

#### Question B6: Motivation for Pooling
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Significant cost savings (30%+)
- Convenience
- Environmental benefits
- Social aspect
- Flexibility
- Other: [Text input]

#### Question B7: Main Concerns (Joining Rides)
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Safety with strangers
- Driver behavior
- Vehicle condition
- Punctuality
- Route flexibility
- Privacy
- Payment issues
- Cancellation problems
- Other: [Text input]
- No major concerns

#### Question B8: Driver Preferences
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Verified documents (Aadhar, License)
- High ratings (4+ stars)
- Many reviews (10+)
- Same gender
- Same city/region
- Can chat before trip
- Vehicle photos
- No specific preferences
- Other: [Text input]

#### Question B9: Comfortable Passenger Count
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Just me (1 passenger total)
- 1-2 other passengers
- 3 other passengers
- Maximum capacity
- Doesn't matter

#### Question B10: Required Cost Savings
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- 20-30% savings
- 30-40% savings
- 40-50% savings
- 50%+ savings
- Cost savings not important
- Other: [Text input]

#### Question B11: Reasonable Pooling Price (300km)
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- ₹200 - ₹400
- ₹400 - ₹600
- ₹600 - ₹800
- ₹800 - ₹1,000
- More than ₹1,000
- Depends on vehicle type

---

### Section B3: Passenger Rental Willingness

#### Question B12: Willingness to Rent Vehicle
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Very willing
- Willing
- Neutral
- Unwilling
- Very unwilling

#### Question B13: Motivation for Rental
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Convenience
- Cost savings vs. taxi
- Flexibility
- Privacy
- Need for specific duration
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
- No major concerns

#### Question B15: Typical Rental Duration Needed
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Few hours (2-6 hours)
- Half day (6-12 hours)
- Full day (12-24 hours)
- Multiple days
- Varies

#### Question B16: Reasonable Car Rental Price
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- ₹200 - ₹400/hour
- ₹400 - ₹600/hour
- ₹600 - ₹800/hour
- ₹800 - ₹1,000/hour
- More than ₹1,000/hour
- Depends on vehicle type

#### Question B17: Reasonable Bike Rental Price
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- ₹100 - ₹200/hour
- ₹200 - ₹300/hour
- ₹300 - ₹400/hour
- ₹400 - ₹500/hour
- More than ₹500/hour
- Depends on bike type

---

### Section B4: Passenger MVP Feature Feedback

#### Question B18: Search Pooling Ease
**Type**: Scale (1-5)
**Required**: Yes (if Part B shown)
**Labels**: 
- 1 = Very difficult
- 5 = Very easy

#### Question B19: Search Rental Ease
**Type**: Scale (1-5)
**Required**: Yes (if Part B shown)
**Labels**: 
- 1 = Very difficult
- 5 = Very easy

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
**Required**: Yes (if Part B shown)
**Options**:
- Extremely important
- Very important
- Moderately important
- Not very important
- Not important

#### Question B22: Food Booking Feature Usefulness
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Very useful - I'd use it often
- Useful - I'd use it sometimes
- Neutral
- Not very useful
- Not useful at all

---

### Section B5: Passenger Safety & Trust

#### Question B23: Safety Features Needed
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Verified driver/owner documents
- User ratings and reviews
- Real-time location sharing with family
- Emergency contact button
- In-app chat before trip
- Insurance coverage
- 24/7 customer support
- Background verification
- Other: [Text input]

#### Question B24: Share Trip Details with Family
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Yes, always
- Yes, sometimes
- No, I prefer privacy
- Not sure

#### Question B25: Rating Importance
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Extremely important
- Very important
- Moderately important
- Not very important
- Not important

#### Question B26: Handling Bad Experience
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Rate them poorly
- Write a review
- Contact support
- Report the issue
- Block the user
- All of the above
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
**Required**: Yes (if Part B shown)
**Options**:
- Yes, if service is good
- Maybe, depends on the amount
- No, I prefer no fees
- Not sure

#### Question B29: Cancellation Policy Importance
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Extremely important
- Very important
- Moderately important
- Not very important
- Not important

---

### Section B7: Passenger Adoption

#### Question B30: Likelihood to Use YAARYATRA
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Very likely
- Likely
- Neutral
- Unlikely
- Very unlikely

#### Question B31: Barriers to Using YAARYATRA
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Safety concerns
- Not enough drivers/vehicles
- Prefer existing options
- Complex interface
- High prices
- Limited availability in my area
- Trust issues
- Other: [Text input]
- Nothing - I'll definitely use it

#### Question B32: Factors Increasing Likelihood
**Type**: Checkboxes (Multiple)
**Required**: No
**Options**:
- Launch discounts/offers
- Referral bonuses
- More drivers/vehicles in my area
- Better safety features
- Lower prices
- Better user reviews
- Insurance coverage
- Other: [Text input]

#### Question B33: Recommendation Likelihood
**Type**: Multiple Choice (Single)
**Required**: Yes (if Part B shown)
**Options**:
- Yes, definitely
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
- Very positive - I'm excited to use it
- Positive - Looks promising
- Neutral - Need to see more
- Negative - Have concerns
- Very negative - Not interested

#### Question C2: Purpose Clarity
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- Very clear
- Clear
- Somewhat clear
- Unclear
- Very unclear

#### Question C3: Interface Intuitiveness
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- Very intuitive - easy to understand
- Intuitive - mostly clear
- Neutral
- Confusing - needs improvement
- Very confusing

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
- None - all were clear
- Other: [Text input]

---

### Section C2: Final Validation

#### Question C5: Problem-Solution Fit
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- Yes, definitely
- Yes, somewhat
- Neutral
- No, not really
- No, definitely not

#### Question C6: Problem Solved
**Type**: Paragraph Text
**Required**: No
**Question**: What problem does YAARYATRA solve for you?

#### Question C7: Biggest Risk/Concern
**Type**: Paragraph Text
**Required**: No
**Question**: What is the BIGGEST RISK or CONCERN you have about YAARYATRA?

#### Question C8: Additional Feedback
**Type**: Paragraph Text
**Required**: No
**Question**: Any additional feedback or suggestions?

#### Question C9: Beta Tester Interest
**Type**: Multiple Choice (Single)
**Required**: Yes
**Options**:
- Yes, definitely
- Yes, maybe
- No, thank you

#### Question C10: Contact Information
**Type**: Short Answer Text
**Required**: No (Yes if C9 = "Yes, definitely" or "Yes, maybe")
**Question**: If yes, please provide your contact information (Phone/Email)

**Conditional Logic**: Show only if Question C9 = "Yes, definitely" or "Yes, maybe"

---

## CONDITIONAL LOGIC SUMMARY

### Main Routing (Question 3):
- **DRIVER/OFFERER** → Show Part A only
- **PASSENGER/USER** → Show Part B only
- **BOTH** → Show Part A + Part B
- **NOT SURE YET** → Show Part A + Part B

### Vehicle Ownership (Question 7):
- **Yes, Car** → Show car-related questions
- **Yes, Bike** → Show bike-related questions
- **Yes, Both** → Show both car and bike questions
- **No** → Hide vehicle owner questions in Part A

### Nested Conditionals:
- Question A11 (Rental Willingness) → If "Very unwilling" → Hide rental-related questions
- Question A15/A16 → Show based on vehicle type
- Question C10 → Show only if C9 = "Yes"

---

## FORM SETUP INSTRUCTIONS

### Step 1: Create New Google Form
1. Go to Google Forms (forms.google.com)
2. Click "+" to create new form
3. Set title: "YAARYATRA MVP Validation Survey"
4. Add description explaining the survey purpose

### Step 2: Configure Settings
1. Click Settings (gear icon)
2. Enable "Collect email addresses" (optional)
3. Enable "Limit to 1 response" (if needed)
4. Set "Send responders a copy of their response" (optional)

### Step 3: Add Questions
Follow the structure above, adding each question in order.

### Step 4: Set Up Conditional Logic
1. For each question with conditional logic, click the three dots menu
2. Select "Go to section based on answer"
3. Configure routing based on the logic specified

### Step 5: Organize Sections
Create sections for:
- Section 1: Introduction
- Section 2: Demographics
- Part A: Driver Questions (if applicable)
- Part B: Passenger Questions (if applicable)
- Part C: Common Questions

### Step 6: Customize Appearance
1. Click Theme (palette icon)
2. Choose appropriate colors/branding
3. Add YAARYATRA logo if available

### Step 7: Share Form
1. Click "Send" button
2. Copy the form link
3. Share with target audience

### Step 8: Set Admin Access
1. Click three dots menu → Settings
2. Add collaborator: n210438@rguktn.ac.in
3. Set as "Editor" or "Owner"

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
- What % of drivers are willing to share rides?
- What % of passengers are willing to join rides?
- What are the top 3 concerns for each group?
- What price ranges are acceptable?
- What features are most important?
- What would increase adoption?

---

## NOTES

- Total Questions: ~83 (if user selects "BOTH")
- Estimated Time: 15-20 minutes
- All conditional logic must be set up in Google Forms
- Test the form thoroughly before sharing
- Consider adding progress indicator
- May want to split into multiple forms if too long
