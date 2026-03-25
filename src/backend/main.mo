import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import VarArray "mo:core/VarArray";

actor {
  include MixinStorage();

  type User = {
    name : Text;
    phone : Text;
  };

  type AnnouncementData = {
    text : Text;
    image : ?Storage.ExternalBlob;
  };

  let adminPassword = "Shahzad@99";
  let announcements = Map.empty<Int, AnnouncementData>();
  let users = Map.empty<Text, User>();
  let teams = Map.empty<Text, Text>();
  let seenCounts = Map.empty<Nat, Bool>();
  let likes = Map.empty<Nat, Bool>();
  let matches = Map.empty<Nat, Text>();

  public query ({ caller }) func getAnnouncement(id : Nat) : async ?AnnouncementData {
    announcements.get(id);
  };

  public shared ({ caller }) func saveSeenCount(id : Nat) : async Nat {
    assert (not seenCounts.containsKey(id));
    seenCounts.add(id, true);
    seenCounts.size();
  };

  public query ({ caller }) func getSeenCount() : async Nat {
    seenCounts.size();
  };

  public shared ({ caller }) func addLike(id : Nat) : async Nat {
    assert (not likes.containsKey(id));
    likes.add(id, true);
    likes.size();
  };

  public query ({ caller }) func getLikeCount() : async Nat {
    likes.size();
  };

  public shared ({ caller }) func deleteMedia(password : Text, id : Nat) : async () {
    assert (Text.equal(password, adminPassword));
    assert (announcements.containsKey(id));
    let announcement = announcements.get(id);
    switch (announcement) {
      case (?a) {
        announcements.add(id, { text = a.text; image = null });
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func createOrUpdateAnnouncement(password : Text, id : Nat, text : Text) : async () {
    assert (Text.equal(password, adminPassword));
    let existingImage = switch (announcements.get(id)) {
      case (?a) { a.image };
      case (null) { null };
    };
    announcements.add(id, { text; image = existingImage });
  };

  public shared ({ caller }) func registerUser(phone : Text, name : Text) : async () {
    users.add(phone, { name; phone });
  };

  public query ({ caller }) func getTeamByPhone(phone : Text) : async ?Text {
    teams.get(phone);
  };

  public shared ({ caller }) func syncTeam(phone : Text, team : Text) : async Nat {
    teams.add(phone, team);
    teams.size();
  };

  public shared ({ caller }) func syncMatch(phone : Text, match : Text) : async Nat {
    matches.add(matches.size(), match);
    matches.size();
  };

  public query ({ caller }) func getTeams() : async [Text] {
    teams.values().toArray();
  };

  public query ({ caller }) func getAllMatches() : async [Text] {
    matches.values().toArray();
  };

  public query ({ caller }) func getTotalUsers() : async Nat {
    users.size();
  };

  public query ({ caller }) func getTotalTeams() : async Nat {
    teams.size();
  };

  public query ({ caller }) func getTotalMatches() : async Nat {
    matches.size();
  };
};
