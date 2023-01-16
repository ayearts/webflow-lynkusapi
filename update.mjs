import { MerkleJson } from "merkle-json";
import fetch from "node-fetch";
import Webflow from "webflow-api";
import { CronJob } from "cron";

const MJ = new MerkleJson();
function containsAnyLetter(str) {
  return /[a-zA-Z]/.test(str);
}
const regions = [
  {
    id: "1",
    name: "Auvergne-Rhone-Alpes",
    departements: [
      "01",
      "03",
      "07",
      "15",
      "26",
      "38",
      "42",
      "43",
      "63",
      "69",
      "73",
      "74",
    ],
  },
  {
    id: "2",
    name: "Bourgogne-Franche-Comte",
    departements: ["21", "25", "39", "58", "70", "71", "89", "90"],
  },
  {
    id: "3",
    name: "Bretagne",
    departements: ["22", "29", "35", "56"],
  },
  {
    id: "4",
    name: "Centre-Val de Loire",
    departements: ["18", "28", "36", "37", "41", "45"],
  },
  {
    id: "5",
    name: "Corse",
    departements: ["2A"],
  },
  {
    id: "6",
    name: "Grand Est",
    departements: ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"],
  },
  {
    id: "7",
    name: "Hauts-de-France",
    departements: ["02", "59", "60", "62", "80"],
  },
  {
    id: "8",
    name: "Ile-de-France",
    departements: ["75", "77", "78", "91", "92", "93", "94", "95"],
  },
  {
    id: "9",
    name: "Normandie",
    departements: ["14", "27", "50", "61", "76"],
  },
  {
    id: "10",
    name: "Nouvelle-Aquitaine",
    departements: [
      "16",
      "17",
      "19",
      "23",
      "24",
      "33",
      "40",
      "47",
      "64",
      "79",
      "86",
      "87",
    ],
  },
  {
    id: "11",
    name: " Occitanie",
    departements: [
      "09",
      "11",
      "12",
      "30",
      "31",
      "32",
      "34",
      "46",
      "48",
      "65",
      "66",
      "81",
      "82",
    ],
  },
  {
    id: "12",
    name: "Pays de la Loire",
    departements: ["44", "49", "53", "72", "85"],
  },
  {
    id: "13",
    name: "Provence-Alpes-Cote d Azur",
    departements: ["04", "05", "06", "13", "83", "84"],
  },
  {
    id: "14",
    name: "Guadeloupe",
    departements: ["971"],
  },
  {
    id: "15",
    name: "Martinique",
    departements: ["972"],
  },
  {
    id: "16",
    name: "Guyane",
    departements: ["973"],
  },
  {
    id: "17",
    name: "Mayotte",
    departements: ["976"],
  },
];
// append hashes to jobs queried from the APIs
async function getJobsWithHashes() {
  try {
    const getJobs = async () => {
      const response = await fetch(
        "https://jobaffinity.fr/feed/x56u1mSPkYBlsZA/json"
      );
      const data = await response.json();
      return data;
    };
    const data = await getJobs();
    const jobsWithHashes = [];
    for (let i = 0; i < data.jobs.length; i++) {
      const job = data.jobs[i];
      const jsonData = JSON.stringify(job);
      const hash = MJ.hash(jsonData);
      const jobWithHash = {
        ...job,
        hash: hash,
      };
      jobsWithHashes.push(jobWithHash);
    }
    return jobsWithHashes;
  } catch (error) {
    console.error(error);
  }
}

// Webflow config
const token =
  "b327d00546907ffaf8e5df1dea23e9436be263c2b6d559cc0736d672a04ffa4c";
const currentOffersCollectionId = "63bd330fae1d290673ea34be";
const webflow = new Webflow({ token: token });

// patch item
async function patchItem(params) {
  const url = `https://api.webflow.com/collections/63bd330fae1d290673ea34be/items/${params.itemid}?live=true`;
  const options = {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization:
        "Bearer b327d00546907ffaf8e5df1dea23e9436be263c2b6d559cc0736d672a04ffa4c",
    },
    body: JSON.stringify({
      fields: {
        slug: params.slug,
        name: params.name,
        _archived: false,
        _draft: false,
        "type-de-contrat-contract-type-abbreviation": params.typeOfContract,
        "date-de-publication": params.publicationDate,
        "code-postal": params.postalCode,
        ville: params.location,
        "apply-link": params.applyLink,
        "job-description": params.jobDesp,
        "company-description": params.employerDescp,
        "profile-description": params.profileDescp,
        "pays-country": params.paysCountry,
        jobid: params.jobId,
        latitude: params.latitude,
        longitude: params.longitude,
        region: params.region ?? "",
        "experience-attribute-0": params.experience ?? "",
        "metier-attribute-1": params.metier ?? "",
        "linkus-interne": params.linkus ?? "",
        jobhash: params.jobhash,
      },
    }),
  };

  const response = await fetch(url, options);
  const res = await response.json();
  return res;
}

// Query jobs from Webflow CMS
const getWebflowJobs = async () => {
  const response = await webflow.items({
    collectionId: currentOffersCollectionId,
  });
  const allJobIds = response;
  console.log(allJobIds, "ALL");
  return allJobIds;
};

const updateItem = async () => {
  const allWebflowJobs = await getWebflowJobs();
  console.log(allWebflowJobs);
  const data = await getJobsWithHashes();

  let idToSlug = {};
  let idToCid = {};
  allWebflowJobs.items.map((eachJob) => {
    idToSlug[eachJob.jobid] = eachJob.slug;
    idToCid[eachJob.jobid] = eachJob._id;
  });
  let allWebflowJobHashes = allWebflowJobs.items
    .map((eachJob) => eachJob.jobhash)
    .filter((item) => item);

  const notMatchingValues = data.reduce((acc, obj) => {
    if (!allWebflowJobHashes.includes(obj.hash)) {
      acc.push(obj);
    }
    return acc;
  }, []);

  console.log(notMatchingValues.length, "JOBS TO BE UPDATED");
  for (const everyJob of notMatchingValues) {
    const params = {};
    params.itemid = idToCid[everyJob.id];
    params.slug = idToSlug[everyJob.id];
    params.name = everyJob.title;
    params.typeOfContract = everyJob.contract_type_abbreviation;
    params.publicationDate = everyJob.last_publication_date;
    params.postalCode = everyJob.zipcode;
    params.location = everyJob.location;
    params.applyLink = everyJob.apply_web_url;
    params.jobDesp = everyJob.position_description;
    params.employerDescp = everyJob.employer_description;
    params.profileDescp = everyJob.profile_description;
    params.paysCountry = everyJob.country;
    params.jobId = everyJob.id.toString();
    params.latitude = everyJob.latitude;
    params.longitude = everyJob.longitude;

    // zipcode to region logic
    if (everyJob.zipcode) {
      if (!containsAnyLetter(everyJob.zipcode)) {
        const jobZipcode = everyJob.zipcode;
        let slicedZipCode = jobZipcode.slice(0, 2);
        if (slicedZipCode === "97") {
          slicedZipCode = jobZipcode.slice(0, 3);
        }
        const matchedRegion = regions.find((region) =>
          region.departements.includes(slicedZipCode)
        );
        params["region"] = matchedRegion.name;
      } else {
        params["region"] = everyJob.zipcode;
      }
    }

    params.jobhash = everyJob.hash;

    if (everyJob.attributes[0]) {
      params.experience = everyJob.attributes[0].value ?? "";
    }
    if (everyJob.attributes[1]) {
      params.metier = everyJob.attributes[1].value ?? "";
    }
    if (everyJob.attributes[2]) {
      params.linkus = everyJob.attributes[2].value ?? "";
    }

    await patchItem(params);
  }
};

updateItem();

const updatecronjob = new CronJob("0 */12 * * *", updateItem);
updatecronjob.start();
