import Time "mo:core/Time";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import VarArray "mo:core/VarArray";

actor {
  include MixinStorage();

  type Gender = {
    #male;
    #female;
    #other;
  };

  type MaritalStatus = {
    #single;
    #married;
    #widowed;
    #divorced;
  };

  type AccountStatus = {
    #active;
    #inactive;
  };

  type AadhaarStatus = {
    #linked;
    #unlinked;
  };

  type Citizen = {
    id : Text;
    name : Text;
    dob : Time.Time;
    gender : Gender;
    maritalStatus : MaritalStatus;
    accountStatus : AccountStatus;
    aadhaarStatus : AadhaarStatus;
    scheme : Text;
    amount : Int;
    lastClaim : ?Time.Time;
    claims : Int;
    photo : ?Storage.ExternalBlob;
  };

  module Citizen {
    public func compare(c1 : Citizen, c2 : Citizen) : Order.Order {
      Text.compare(c1.id, c2.id);
    };
  };

  type ClaimStatus = {
    #approved;
    #denied;
  };

  type Transaction = {
    id : Text;
    timestamp : Time.Time;
    citizenId : Text;
    scheme : Text;
    amount : Int;
    status : ClaimStatus;
  };

  type SystemStatus = {
    #active;
    #paused;
    #frozen;
  };

  let citizens = Map.empty<Text, Citizen>();
  let transactions = Map.empty<Text, Transaction>();

  var systemStatus : SystemStatus = #active;
  var budget : Int = 1_000_000;

  type InputCitizen = {
    id : Text;
    name : Text;
    dob : Time.Time;
    gender : Gender;
    maritalStatus : MaritalStatus;
    scheme : Text;
    amount : Int;
    photo : ?Storage.ExternalBlob;
  };

  public shared ({ caller }) func addCitizen(input : InputCitizen) : async () {
    if (citizens.containsKey(input.id)) {
      Runtime.trap("Citizen with this ID already exists");
    };

    let citizen : Citizen = {
      id = input.id;
      name = input.name;
      dob = input.dob;
      gender = input.gender;
      maritalStatus = input.maritalStatus;
      accountStatus = #active;
      aadhaarStatus = #unlinked;
      scheme = input.scheme;
      amount = input.amount;
      lastClaim = null;
      claims = 0;
      photo = input.photo;
    };

    citizens.add(input.id, citizen);
  };

  public shared ({ caller }) func addCitizens(batch : [InputCitizen]) : async () {
    batch.forEach(
      func(input) {
        if (not citizens.containsKey(input.id)) {
          let citizen : Citizen = {
            id = input.id;
            name = input.name;
            dob = input.dob;
            gender = input.gender;
            maritalStatus = input.maritalStatus;
            accountStatus = #active;
            aadhaarStatus = #unlinked;
            scheme = input.scheme;
            amount = input.amount;
            lastClaim = null;
            claims = 0;
            photo = input.photo;
          };
          citizens.add(input.id, citizen);
        };
      }
    );
  };

  public query ({ caller }) func getCitizen(id : Text) : async ?Citizen {
    citizens.get(id);
  };

  public query ({ caller }) func getAllCitizens() : async [Citizen] {
    citizens.values().toArray().sort();
  };

  public query ({ caller }) func countCitizens() : async Nat {
    citizens.size();
  };

  public shared ({ caller }) func claimBenefits(id : Text, scheme : Text, amount : Int) : async Text {
    switch (systemStatus) {
      case (#active) {
        switch (citizens.get(id)) {
          case (null) { return "Citizen not found" };
          case (?citizen) {
            switch (citizen.accountStatus) {
              case (#inactive) { return "Account is inactive" };
              case (#active) {
                switch (citizen.aadhaarStatus) {
                  case (#unlinked) { return "Aadhaar not linked" };
                  case (#linked) {
                    if (citizen.scheme != scheme) {
                      return "Scheme mismatch";
                    };
                    if (citizen.amount != amount) {
                      return "Amount mismatch";
                    };
                    if (citizen.claims >= 4) {
                      return "Maximum claims reached";
                    };
                    if (budget < amount) {
                      return "Insufficient budget";
                    };
                    switch (citizen.lastClaim) {
                      case (?last) {
                        if (Time.now() - last < 30 * 24 * 60 * 60 * 1_000_000_000) {
                          return "Claim not allowed within 30 days";
                        };
                      };
                      case (null) {};
                    };

                    budget -= amount;
                    let updatedCitizen : Citizen = {
                      id = citizen.id;
                      name = citizen.name;
                      dob = citizen.dob;
                      gender = citizen.gender;
                      maritalStatus = citizen.maritalStatus;
                      accountStatus = citizen.accountStatus;
                      aadhaarStatus = citizen.aadhaarStatus;
                      scheme = citizen.scheme;
                      amount = citizen.amount;
                      lastClaim = ?Time.now();
                      claims = citizen.claims + 1;
                      photo = citizen.photo;
                    };
                    citizens.add(id, updatedCitizen);

                    let transaction : Transaction = {
                      id = "txn" # id # Time.now().toText();
                      timestamp = Time.now();
                      citizenId = id;
                      scheme;
                      amount;
                      status = #approved;
                    };
                    transactions.add(transaction.id, transaction);

                    if (budget == 0) {
                      systemStatus := #frozen;
                    };

                    return "Claim approved. Remaining budget: " # budget.toText();
                  };
                };
              };
            };
          };
        };
      };
      case (#paused) { return "System is currently paused" };
      case (#frozen) { return "System is frozen" };
    };
  };

  public shared ({ caller }) func updateAadhaarStatus(id : Text, status : AadhaarStatus) : async () {
    switch (citizens.get(id)) {
      case (null) { Runtime.trap("Citizen not found") };
      case (?citizen) {
        let updatedCitizen : Citizen = {
          id = citizen.id;
          name = citizen.name;
          dob = citizen.dob;
          gender = citizen.gender;
          maritalStatus = citizen.maritalStatus;
          accountStatus = citizen.accountStatus;
          aadhaarStatus = status;
          scheme = citizen.scheme;
          amount = citizen.amount;
          lastClaim = citizen.lastClaim;
          claims = citizen.claims;
          photo = citizen.photo;
        };
        citizens.add(id, updatedCitizen);
      };
    };
  };

  public shared ({ caller }) func setSystemStatus(status : SystemStatus) : async () {
    systemStatus := status;
  };

  public shared ({ caller }) func resetBudget(amount : Int) : async () {
    budget := amount;
    if (budget > 0 and systemStatus == #frozen) {
      systemStatus := #active;
    };
  };

  public query ({ caller }) func getSystemStatus() : async SystemStatus {
    systemStatus;
  };

  public query ({ caller }) func getBudget() : async Int {
    budget;
  };

  public query ({ caller }) func countTransactions() : async Nat {
    transactions.size();
  };

  public query ({ caller }) func getTransactions() : async [Transaction] {
    transactions.values().toArray();
  };

  public query ({ caller }) func getTotalDisbursed() : async Int {
    var total : Int = 0;
    transactions.values().forEach(
      func(txn) {
        total += txn.amount;
      }
    );
    total;
  };

  public shared ({ caller }) func deleteAllInactiveCitizens() : async () {
    let inactiveIds = citizens.toVarArray().filter(
      func((id, citizen)) {
        switch (citizen.accountStatus) {
          case (#inactive) { true };
          case (#active) { false };
        };
      }
    );

    inactiveIds.forEach(
      func((id, _)) {
        citizens.remove(id);
      }
    );
  };
};
