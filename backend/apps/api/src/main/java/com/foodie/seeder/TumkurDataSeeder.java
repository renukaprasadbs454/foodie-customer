package com.foodie.seeder;

import com.foodie.auth.entity.UserCredential;
import com.foodie.auth.repository.UserCredentialRepository;
import com.foodie.common.enums.UserType;
import com.foodie.menu.entity.Category;
import com.foodie.menu.entity.MenuItem;
import com.foodie.menu.repository.CategoryRepository;
import com.foodie.menu.repository.MenuItemRepository;
import com.foodie.restaurant.entity.Restaurant;
import com.foodie.restaurant.entity.RestaurantAddress;
import com.foodie.restaurant.repository.RestaurantAddressRepository;
import com.foodie.restaurant.repository.RestaurantRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Component
public class TumkurDataSeeder implements ApplicationRunner {

        private final UserCredentialRepository userCredentialRepository;
        private final RestaurantAddressRepository restaurantAddressRepository;
        private final RestaurantRepository restaurantRepository;
        private final CategoryRepository categoryRepository;
        private final MenuItemRepository menuItemRepository;

        public TumkurDataSeeder(
                        UserCredentialRepository userCredentialRepository,
                        RestaurantAddressRepository restaurantAddressRepository,
                        RestaurantRepository restaurantRepository,
                        CategoryRepository categoryRepository,
                        MenuItemRepository menuItemRepository) {
                this.userCredentialRepository = userCredentialRepository;
                this.restaurantAddressRepository = restaurantAddressRepository;
                this.restaurantRepository = restaurantRepository;
                this.categoryRepository = categoryRepository;
                this.menuItemRepository = menuItemRepository;
        }

        @Override
        public void run(ApplicationArguments args) {
                if (restaurantRepository.count() > 0) {
                        return;
                }

                System.out.println("Starting Tumkur Zomato Data Seeder...");

                // Coordinates for Tumkur roughly 13.3379° N, 77.1173° E
                double baseLat = 13.3379;
                double baseLng = 77.1173;

                String[] tumkurRestaurants = {
                                "Meghana Foods (Biryani)", "CTR (Dosa)", "Burger King",
                                "Empire Restaurant", "Kritunga", "Nandhana Palace",
                                "Leon Grill", "KFC Tumkur", "Domino's Pizza", "Oven Story"
                };

                String[] cuisineVarieties = {
                                "Biriyani, South Indian", "South Indian, Dosa", "Burger, Fast Food",
                                "North Indian, Mughlai", "South Indian, Biriyani", "Andhra, South Indian",
                                "Fast Food, Burger", "Fast Food, Burger", "Pizza, Fast Food", "Pizza, Italian"
                };

                for (int i = 0; i < 10; i++) {
                        UserCredential owner = UserCredential.phoneSignup("96867000" + String.format("%02d", i),
                                        UserType.RESTAURANT);
                        userCredentialRepository.save(owner);

                        RestaurantAddress address = RestaurantAddress.create(
                                        "Building " + (i * 100),
                                        "MG Road, Tumkur",
                                        "Tumkur",
                                        "572101",
                                        BigDecimal.valueOf(baseLat + (Math.random() * 0.05)),
                                        BigDecimal.valueOf(baseLng + (Math.random() * 0.05)));
                        restaurantAddressRepository.save(address);

                        String[] cuisines = cuisineVarieties[i].split(", ");

                        Restaurant r = Restaurant.createPending(
                                        owner.getId(),
                                        tumkurRestaurants[i],
                                        "Premium " + cuisines[0] + " restaurant in Tumkur",
                                        cuisines,
                                        address,
                                        BigDecimal.valueOf(15.0));
                        r.approve(); // Auto approve for testing
                        r.updateAvgRating(BigDecimal.valueOf(4.0 + (Math.random())));
                        r.setLogoImageKey("default_logo.png"); // placeholder
                        r.setCoverImageKey("default_cover.png");
                        restaurantRepository.save(r);

                        Category biryani = Category.create(r.getId(), "Biriyani", 1);
                        Category dosa = Category.create(r.getId(), "Dosa", 2);
                        Category south = Category.create(r.getId(), "South", 3);
                        Category north = Category.create(r.getId(), "North", 4);
                        Category burger = Category.create(r.getId(), "Burger", 5);
                        categoryRepository.saveAll(List.of(biryani, dosa, south, north, burger));

                        MenuItem m1 = MenuItem.create(r.getId(), biryani.getId(), "Hyderabadi Chicken Biriyani",
                                        "Authentic hyderabadi biryani", BigDecimal.valueOf(250.0), false);
                        MenuItem m2 = MenuItem.create(r.getId(), biryani.getId(), "Mutton Dum Biriyani",
                                        "Special slow cooked mutton", BigDecimal.valueOf(350.0), false);
                        MenuItem m3 = MenuItem.create(r.getId(), dosa.getId(), "Masala Dosa",
                                        "Crispy dosa with chutney", BigDecimal.valueOf(80.0), true);
                        MenuItem m4 = MenuItem.create(r.getId(), dosa.getId(), "Set Dosa", "Soft fluffy dosa",
                                        BigDecimal.valueOf(70.0), true);
                        MenuItem m5 = MenuItem.create(r.getId(), south.getId(), "South Indian Meals",
                                        "Full coarse rice and curries", BigDecimal.valueOf(150.0), true);
                        MenuItem m6 = MenuItem.create(r.getId(), south.getId(), "Idli Vada",
                                        "Hot idli with crispy vada", BigDecimal.valueOf(60.0), true);
                        MenuItem m7 = MenuItem.create(r.getId(), north.getId(), "Butter Chicken",
                                        "North Indian style chicken", BigDecimal.valueOf(280.0), false);
                        MenuItem m8 = MenuItem.create(r.getId(), north.getId(), "Paneer Tikka",
                                        "Grilled paneer soft cubes", BigDecimal.valueOf(220.0), true);
                        MenuItem m9 = MenuItem.create(r.getId(), burger.getId(), "Veg Whopper Burger",
                                        "Large veg burger", BigDecimal.valueOf(150.0), true);
                        MenuItem m10 = MenuItem.create(r.getId(), burger.getId(), "Chicken Zinger Burger",
                                        "Crispy chicken burger", BigDecimal.valueOf(190.0), false);

                        m1.setImageS3Key("mock_biryani.png");
                        m2.setImageS3Key("mock_biryani.png");
                        m3.setImageS3Key("mock_dosa.png");
                        m4.setImageS3Key("mock_dosa.png");
                        m5.setImageS3Key("mock_image.png");
                        m6.setImageS3Key("mock_image.png");
                        m7.setImageS3Key("mock_image.png");
                        m8.setImageS3Key("mock_image.png");
                        m9.setImageS3Key("mock_burger.png");
                        m10.setImageS3Key("mock_burger.png");

                        menuItemRepository.saveAll(List.of(m1, m2, m3, m4, m5, m6, m7, m8, m9, m10));
                }
                System.out.println("Tumkur Data Seeding Completed!");
        }
}
