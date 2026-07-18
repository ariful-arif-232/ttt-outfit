/**
 * TTT Outfit — Bangladesh Address Dropdown Helper
 *
 * Expected checkout fields (any one matching selector works):
 *   Division: #division, select[name="division"], [data-bd-division]
 *   District: #district, select[name="district"], [data-bd-district]
 *   Area:     #area, select[name="area"], [data-bd-area]
 *
 * Optional existing values can be provided using:
 *   data-selected="Dhaka"
 *
 * The script is defensive:
 * - It does nothing when the required dropdowns are not present.
 * - It does not overwrite unrelated form fields.
 * - It preserves an already selected value when possible.
 */

(function () {
  "use strict";

  const BD_ADDRESSES = Object.freeze({
    Barishal: Object.freeze({
      Barguna: ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Patharghata", "Taltali"],
      Barishal: ["Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Barishal Sadar", "Gournadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"],
      Bhola: ["Bhola Sadar", "Borhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"],
      Jhalokati: ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"],
      Patuakhali: ["Bauphal", "Dashmina", "Dumki", "Galachipa", "Kalapara", "Mirzaganj", "Patuakhali Sadar", "Rangabali"],
      Pirojpur: ["Bhandaria", "Indurkani", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Pirojpur Sadar"]
    }),

    Chattogram: Object.freeze({
      Bandarban: ["Alikadam", "Bandarban Sadar", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"],
      Brahmanbaria: ["Akhaura", "Ashuganj", "Bancharampur", "Bijoynagar", "Brahmanbaria Sadar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail"],
      Chandpur: ["Chandpur Sadar", "Faridganj", "Haimchar", "Hajiganj", "Kachua", "Matlab Dakshin", "Matlab Uttar", "Shahrasti"],
      Chattogram: ["Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Chattogram City", "Fatikchhari", "Hathazari", "Karnaphuli", "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania", "Sitakunda"],
      Cumilla: ["Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Cumilla Adarsha Sadar", "Cumilla Sadar Dakshin", "Daudkandi", "Debidwar", "Homna", "Laksam", "Lalmai", "Meghna", "Monoharganj", "Muradnagar", "Nangalkot", "Titas"],
      "Cox's Bazar": ["Chakaria", "Cox's Bazar Sadar", "Eidgaon", "Kutubdia", "Maheshkhali", "Pekua", "Ramu", "Teknaf", "Ukhia"],
      Feni: ["Chhagalnaiya", "Daganbhuiyan", "Feni Sadar", "Fulgazi", "Parshuram", "Sonagazi"],
      Khagrachhari: ["Dighinala", "Guimara", "Khagrachhari Sadar", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh"],
      Lakshmipur: ["Kamalnagar", "Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati"],
      Noakhali: ["Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Kabirhat", "Noakhali Sadar", "Senbagh", "Sonaimuri", "Subarnachar"],
      Rangamati: ["Baghaichhari", "Barkal", "Belaichhari", "Juraichhari", "Kaptai", "Kawkhali", "Langadu", "Naniarchar", "Rajasthali", "Rangamati Sadar"]
    }),

    Dhaka: Object.freeze({
      Dhaka: ["Adabor", "Badda", "Banani", "Bangshal", "Cantonment", "Chawkbazar", "Dakshinkhan", "Dhanmondi", "Gendaria", "Gulshan", "Hazaribagh", "Jatrabari", "Kadamtali", "Kafrul", "Kalabagan", "Kamrangirchar", "Khilgaon", "Khilkhet", "Kotwali", "Lalbagh", "Mirpur", "Mohammadpur", "Motijheel", "New Market", "Pallabi", "Paltan", "Ramna", "Rampura", "Sabujbagh", "Savar", "Shah Ali", "Shahbagh", "Sher-e-Bangla Nagar", "Shyampur", "Sutrapur", "Tejgaon", "Tejgaon Industrial Area", "Turag", "Uttara", "Uttarkhan", "Wari"],
      Faridpur: ["Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan", "Faridpur Sadar", "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha"],
      Gazipur: ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur", "Tongi"],
      Gopalganj: ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
      Kishoreganj: ["Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimganj", "Katiadi", "Kishoreganj Sadar", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail"],
      Madaripur: ["Dasar", "Kalkini", "Madaripur Sadar", "Rajoir", "Shibchar"],
      Manikganj: ["Daulatpur", "Ghior", "Harirampur", "Manikganj Sadar", "Saturia", "Shibalaya", "Singair"],
      Munshiganj: ["Gazaria", "Lohajang", "Munshiganj Sadar", "Sirajdikhan", "Sreenagar", "Tongibari"],
      Narayanganj: ["Araihazar", "Bandar", "Narayanganj Sadar", "Rupganj", "Sonargaon"],
      Narsingdi: ["Belabo", "Monohardi", "Narsingdi Sadar", "Palash", "Raipura", "Shibpur"],
      Rajbari: ["Baliakandi", "Goalandaghat", "Kalukhali", "Pangsha", "Rajbari Sadar"],
      Shariatpur: ["Bhedarganj", "Damudya", "Gosairhat", "Jajira", "Naria", "Shariatpur Sadar"],
      Tangail: ["Basail", "Bhuapur", "Delduar", "Dhanbari", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar"]
    }),

    Khulna: Object.freeze({
      Bagerhat: ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"],
      Chuadanga: ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Jibannagar"],
      Jashore: ["Abhaynagar", "Bagherpara", "Chaugachha", "Jashore Sadar", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"],
      Jhenaidah: ["Harinakunda", "Jhenaidah Sadar", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"],
      Khulna: ["Batiaghata", "Dacope", "Dumuria", "Dighalia", "Khalishpur", "Khan Jahan Ali", "Khulna Sadar", "Koyra", "Paikgachha", "Phultala", "Rupsa", "Sonadanga", "Terokhada"],
      Kushtia: ["Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Kushtia Sadar", "Mirpur"],
      Magura: ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
      Meherpur: ["Gangni", "Meherpur Sadar", "Mujibnagar"],
      Narail: ["Kalia", "Lohagara", "Narail Sadar"],
      Satkhira: ["Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Satkhira Sadar", "Shyamnagar", "Tala"]
    }),

    Mymensingh: Object.freeze({
      Jamalpur: ["Bakshiganj", "Dewanganj", "Islampur", "Jamalpur Sadar", "Madarganj", "Melandaha", "Sarishabari"],
      Mymensingh: ["Bhaluka", "Dhobaura", "Fulbaria", "Gaffargaon", "Gauripur", "Haluaghat", "Ishwarganj", "Muktagachha", "Mymensingh Sadar", "Nandail", "Phulpur", "Tara Khanda", "Trishal"],
      Netrokona: ["Atpara", "Barhatta", "Durgapur", "Khaliajuri", "Kalmakanda", "Kendua", "Madan", "Mohanganj", "Netrokona Sadar", "Purbadhala"],
      Sherpur: ["Jhenaigati", "Nakla", "Nalitabari", "Sherpur Sadar", "Sreebardi"]
    }),

    Rajshahi: Object.freeze({
      Bogura: ["Adamdighi", "Bogura Sadar", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatala"],
      Joypurhat: ["Akkelpur", "Joypurhat Sadar", "Kalai", "Khetlal", "Panchbibi"],
      Naogaon: ["Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mahadebpur", "Naogaon Sadar", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"],
      Natore: ["Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Naldanga", "Natore Sadar", "Singra"],
      Chapainawabganj: ["Bholahat", "Gomastapur", "Nachole", "Nawabganj Sadar", "Shibganj"],
      Pabna: ["Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Pabna Sadar", "Santhia", "Sujanagar"],
      Rajshahi: ["Bagha", "Bagmara", "Boalia", "Charghat", "Durgapur", "Godagari", "Matihar", "Mohanpur", "Paba", "Puthia", "Rajpara", "Shah Makhdum", "Tanore"],
      Sirajganj: ["Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Raiganj", "Shahjadpur", "Sirajganj Sadar", "Tarash", "Ullapara"]
    }),

    Rangpur: Object.freeze({
      Dinajpur: ["Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Dinajpur Sadar", "Fulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur"],
      Gaibandha: ["Fulchhari", "Gaibandha Sadar", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"],
      Kurigram: ["Bhurungamari", "Char Rajibpur", "Chilmari", "Kurigram Sadar", "Nageshwari", "Phulbari", "Rajarhat", "Raomari", "Ulipur"],
      Lalmonirhat: ["Aditmari", "Hatibandha", "Kaliganj", "Lalmonirhat Sadar", "Patgram"],
      Nilphamari: ["Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Nilphamari Sadar", "Saidpur"],
      Panchagarh: ["Atwari", "Boda", "Debiganj", "Panchagarh Sadar", "Tetulia"],
      Rangpur: ["Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Rangpur Sadar", "Taraganj"],
      Thakurgaon: ["Baliadangi", "Haripur", "Pirganj", "Ranisankail", "Thakurgaon Sadar"]
    }),

    Sylhet: Object.freeze({
      Habiganj: ["Ajmiriganj", "Bahubal", "Baniachong", "Chunarughat", "Habiganj Sadar", "Lakhai", "Madhabpur", "Nabiganj", "Shayestaganj"],
      Moulvibazar: ["Barlekha", "Juri", "Kamalganj", "Kulaura", "Moulvibazar Sadar", "Rajnagar", "Sreemangal"],
      Sunamganj: ["Bishwambharpur", "Chhatak", "Dakshin Sunamganj", "Derai", "Dharampasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Madhyanagar", "Shalla", "Sunamganj Sadar", "Tahirpur"],
      Sylhet: ["Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Dakshin Surma", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Osmani Nagar", "Sylhet Sadar", "Zakiganj"]
    })
  });

  const SELECTORS = Object.freeze({
    division: [
      "[data-bd-division]",
      "#division",
      'select[name="division"]'
    ],
    district: [
      "[data-bd-district]",
      "#district",
      'select[name="district"]'
    ],
    area: [
      "[data-bd-area]",
      "#area",
      'select[name="area"]'
    ]
  });

  function findFirst(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function findMatchingValue(values, requestedValue) {
    const requested = normalize(requestedValue);

    if (!requested) {
      return "";
    }

    return values.find((value) => normalize(value) === requested) || "";
  }

  function getInitialValue(select) {
    if (!select) {
      return "";
    }

    return (
      select.dataset.selected ||
      select.getAttribute("data-value") ||
      select.value ||
      ""
    );
  }

  function replaceOptions(select, values, placeholder, selectedValue) {
    if (!select) {
      return;
    }

    const safeValues = Array.isArray(values) ? values : [];
    const matchedValue = findMatchingValue(safeValues, selectedValue);

    select.replaceChildren();

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    placeholderOption.selected = !matchedValue;
    select.appendChild(placeholderOption);

    safeValues.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = value === matchedValue;
      select.appendChild(option);
    });

    select.disabled = safeValues.length === 0;
  }

  function initializeBangladeshAddressDropdowns() {
    const divisionSelect = findFirst(SELECTORS.division);
    const districtSelect = findFirst(SELECTORS.district);
    const areaSelect = findFirst(SELECTORS.area);

    // Division and district are required.
    // Area is optional so older checkout forms remain compatible.
    if (!divisionSelect || !districtSelect) {
      return;
    }

    const initialDivision = getInitialValue(divisionSelect);
    const initialDistrict = getInitialValue(districtSelect);
    const initialArea = getInitialValue(areaSelect);

    const divisions = Object.keys(BD_ADDRESSES);
    replaceOptions(
      divisionSelect,
      divisions,
      "Select division",
      initialDivision
    );

    function updateDistricts(selectedDistrict) {
      const division = divisionSelect.value;
      const districts = division && BD_ADDRESSES[division]
        ? Object.keys(BD_ADDRESSES[division])
        : [];

      replaceOptions(
        districtSelect,
        districts,
        "Select district",
        selectedDistrict
      );

      updateAreas(initialArea);
    }

    function updateAreas(selectedArea) {
      if (!areaSelect) {
        return;
      }

      const division = divisionSelect.value;
      const district = districtSelect.value;

      const areas =
        division &&
        district &&
        BD_ADDRESSES[division] &&
        Array.isArray(BD_ADDRESSES[division][district])
          ? BD_ADDRESSES[division][district]
          : [];

      replaceOptions(
        areaSelect,
        areas,
        "Select area / upazila",
        selectedArea
      );
    }

    divisionSelect.addEventListener("change", function () {
      updateDistricts("");
    });

    districtSelect.addEventListener("change", function () {
      updateAreas("");
    });

    updateDistricts(initialDistrict);
  }

  // Expose read-only data for optional project use.
  // Existing code does not need to call this.
  window.TTTBangladeshAddresses = BD_ADDRESSES;
  window.initializeBangladeshAddressDropdowns =
    initializeBangladeshAddressDropdowns;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeBangladeshAddressDropdowns,
      { once: true }
    );
  } else {
    initializeBangladeshAddressDropdowns();
  }
})();
