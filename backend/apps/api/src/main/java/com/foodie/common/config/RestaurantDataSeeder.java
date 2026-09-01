package com.foodie.common.config;

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
import java.math.BigDecimal;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(20)
public class RestaurantDataSeeder implements ApplicationRunner {

        private static final Logger log = LoggerFactory.getLogger(RestaurantDataSeeder.class);

        private final UserCredentialRepository userCredentialRepository;
        private final RestaurantRepository restaurantRepository;
        private final RestaurantAddressRepository restaurantAddressRepository;
        private final CategoryRepository categoryRepository;
        private final MenuItemRepository menuItemRepository;
        private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

        public RestaurantDataSeeder(
                        UserCredentialRepository userCredentialRepository,
                        RestaurantRepository restaurantRepository,
                        RestaurantAddressRepository restaurantAddressRepository,
                        CategoryRepository categoryRepository,
                        MenuItemRepository menuItemRepository,
                        org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
                this.userCredentialRepository = userCredentialRepository;
                this.restaurantRepository = restaurantRepository;
                this.restaurantAddressRepository = restaurantAddressRepository;
                this.categoryRepository = categoryRepository;
                this.menuItemRepository = menuItemRepository;
                this.jdbcTemplate = jdbcTemplate;
        }

        @Override
        @Transactional
        public void run(ApplicationArguments args) {
                if (restaurantRepository.count() > 0) {
                        log.info("Restaurants already seeded in persistent database. Preserving existing data.");
                        return;
                }

                log.info("Seeding 4 realistic approved restaurants with 10 menu items each...");
                seedRestaurant1();
                seedRestaurant2();
                seedRestaurant3();
                seedRestaurant4();

                log.info("Successfully seeded 4 approved restaurants with full menus!");
        }

        private void seedRestaurant1() {
                String phone = "+919800000001";
                UserCredential owner = userCredentialRepository.findByPhoneNumberAndUserType(phone, UserType.RESTAURANT)
                                .orElseGet(() -> userCredentialRepository
                                                .save(UserCredential.phoneSignup(phone, UserType.RESTAURANT)));

                Restaurant resto = restaurantRepository.findByOwnerUserCredentialId(owner.getId()).orElse(null);
                if (resto == null) {
                        RestaurantAddress addr = restaurantAddressRepository.save(RestaurantAddress.create(
                                        "100 Feet Road, Indiranagar", "Near Metro Station", "Indiranagar", "Bengaluru",
                                        "Karnataka", "India",
                                        "560038",
                                        "100 Feet Road, Indiranagar, Bengaluru - 560038", new BigDecimal("12.9784"),
                                        new BigDecimal("77.6408")));

                        resto = Restaurant.createPending(
                                        owner.getId(),
                                        "Spice Garden Biryani & North Indian",
                                        "Authentic Royal Hyderabadi Biryanis, Tandoori Kebabs & Rich North Indian Curries prepared by Master Chefs.",
                                        new String[] { "Indian", "Biryani", "North Indian", "Mughlai" },
                                        addr,
                                        new BigDecimal("15.00"));
                        resto.approve();
                        resto.updateAvgRating(new BigDecimal("4.8"));
                        resto.setCoverImageKey(
                                        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800");
                        resto.setLogoImageKey(
                                        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800");
                        resto = restaurantRepository.save(resto);
                }

                if (!categoryRepository.findByRestaurantIdOrderByDisplayOrderAsc(resto.getId()).isEmpty()) {
                        return;
                }

                Category cat1 = categoryRepository
                                .save(Category.create(resto.getId(), "Signature Biryanis & Mains", 1));
                Category cat2 = categoryRepository.save(Category.create(resto.getId(), "Starters & Desserts", 2));

                createItem(resto.getId(), cat1.getId(), "Hyderabadi Mutton Dum Biryani",
                                "Slow-cooked fragrant basmati rice with tender mutton pieces and secret spices.",
                                new BigDecimal("380.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Special Paneer Butter Masala",
                                "Cottage cheese cubes simmered in rich creamy tomato cashew gravy.",
                                new BigDecimal("260.00"), true,
                                "VEG", "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Dal Makhani Special",
                                "Black lentils slow-cooked overnight with butter, cream, and aromatic Indian herbs.",
                                new BigDecimal("220.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Mutton Rogan Josh",
                                "Kashmiri style tender mutton curry cooked in traditional onion tomato gravy.",
                                new BigDecimal("390.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1545247181-516773cae754?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Malai Kofta Curry",
                                "Deep-fried cottage cheese and potato dumplings served in velvety white gravy.",
                                new BigDecimal("250.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=600");

                createItem(resto.getId(), cat2.getId(), "Tandoori Chicken Full",
                                "Whole chicken marinated in yogurt and tikka spices, cooked in charcoal clay tandoor.",
                                new BigDecimal("420.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Garlic Butter Naan",
                                "Fresh tandoor bread brushed with melted garlic butter.", new BigDecimal("50.00"), true,
                                "VEG",
                                "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Chicken Tikka Kebabs (6pcs)",
                                "Boneless chicken marinated in spiced yogurt, skewered and charred to perfection.",
                                new BigDecimal("290.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Gulab Jamun with Ice Cream",
                                "Warm soft milk dumplings served with cold vanilla bean ice cream.",
                                new BigDecimal("110.00"), true,
                                "VEG", "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Sweet Punjabi Lassi",
                                "Thick churned yogurt drink flavoured with cardamom and pistachios.",
                                new BigDecimal("80.00"), true,
                                "VEG", "https://images.unsplash.com/photo-1571006682880-60b64d0e6592?q=80&w=600");
        }

        private void seedRestaurant2() {
                String phone = "+919800000002";
                UserCredential owner = userCredentialRepository.findByPhoneNumberAndUserType(phone, UserType.RESTAURANT)
                                .orElseGet(() -> userCredentialRepository
                                                .save(UserCredential.phoneSignup(phone, UserType.RESTAURANT)));

                Restaurant resto = restaurantRepository.findByOwnerUserCredentialId(owner.getId()).orElse(null);
                if (resto == null) {
                        RestaurantAddress addr = restaurantAddressRepository.save(RestaurantAddress.create(
                                        "12th Main Road, Koramangala", "5th Block", "Koramangala", "Bengaluru",
                                        "Karnataka",
                                        "India", "560034",
                                        "12th Main Road, Koramangala, Bengaluru - 560034", new BigDecimal("12.9352"),
                                        new BigDecimal("77.6245")));

                        resto = Restaurant.createPending(
                                        owner.getId(),
                                        "Pizza Horizon & Italian Bistro",
                                        "Wood-fired Artisanal Pizzas, Handcrafted Pasta, Crispy Appetizers & Decadent Italian Desserts.",
                                        new String[] { "Italian", "Pizza", "Pasta", "Fast Food" },
                                        addr,
                                        new BigDecimal("15.00"));
                        resto.approve();
                        resto.updateAvgRating(new BigDecimal("4.7"));
                        resto.setCoverImageKey(
                                        "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800");
                        resto.setLogoImageKey(
                                        "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800");
                        resto = restaurantRepository.save(resto);
                }

                if (!categoryRepository.findByRestaurantIdOrderByDisplayOrderAsc(resto.getId()).isEmpty()) {
                        return;
                }

                Category cat1 = categoryRepository.save(Category.create(resto.getId(), "Artisanal Pizzas", 1));
                Category cat2 = categoryRepository.save(Category.create(resto.getId(), "Pastas & Sides", 2));

                createItem(resto.getId(), cat1.getId(), "Classic Margherita Pizza",
                                "Fresh mozzarella, San Marzano tomato sauce, fresh basil and extra virgin olive oil.",
                                new BigDecimal("299.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Pepperoni Passion Pizza",
                                "Loaded premium pork pepperoni slices, mozzarella cheese and Italian herb sauce.",
                                new BigDecimal("449.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Farmhouse Mushroom Pizza",
                                "Wild mushrooms, bell peppers, sweet corn, red onions and mozzarella cheese.",
                                new BigDecimal("379.00"),
                                true, "VEG", "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Spicy BBQ Chicken Pizza",
                                "Smokey BBQ chicken, red paprika, caramelised onions and garlic oil.",
                                new BigDecimal("429.00"), false,
                                "NON_VEG", "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600");

                createItem(resto.getId(), cat2.getId(), "Cheesy Garlic Breadsticks",
                                "Fresh baked breadsticks smothered in mozzarella and crushed garlic butter.",
                                new BigDecimal("149.00"),
                                true, "VEG", "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Creamy Alfredo Fettuccine Pasta",
                                "Ribbon pasta tossed in parmesan garlic cream sauce with garden vegetables.",
                                new BigDecimal("310.00"),
                                true, "VEG", "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Spicy Arrabbiata Penne Pasta",
                                "Penne pasta in fiery tomato chili red sauce topped with shaved parmesan.",
                                new BigDecimal("280.00"),
                                true, "VEG", "https://images.unsplash.com/photo-1621996346565-e3d5d6281288?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Crispy Chicken Wings (6pcs)",
                                "Jumbo wings tossed in spicy Buffalo sauce served with blue cheese dip.",
                                new BigDecimal("269.00"),
                                false, "NON_VEG",
                                "https://images.unsplash.com/photo-1527477396000-e27163b481c2?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Italian Caesar Salad",
                                "Crisp romaine lettuce, garlic croutons, parmesan flakes and homemade Caesar dressing.",
                                new BigDecimal("220.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Signature Tiramisu",
                                "Classic Italian espresso-soaked ladyfingers layered with mascarpone cream.",
                                new BigDecimal("179.00"),
                                true, "VEG", "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=600");
        }

        private void seedRestaurant3() {
                String phone = "+919800000003";
                UserCredential owner = userCredentialRepository.findByPhoneNumberAndUserType(phone, UserType.RESTAURANT)
                                .orElseGet(() -> userCredentialRepository
                                                .save(UserCredential.phoneSignup(phone, UserType.RESTAURANT)));

                Restaurant resto = restaurantRepository.findByOwnerUserCredentialId(owner.getId()).orElse(null);
                if (resto == null) {
                        RestaurantAddress addr = restaurantAddressRepository.save(RestaurantAddress.create(
                                        "Church Street, MG Road", "Near Metro Station", "MG Road", "Bengaluru",
                                        "Karnataka",
                                        "India", "560001",
                                        "Church Street, MG Road, Bengaluru - 560001", new BigDecimal("12.9756"),
                                        new BigDecimal("77.6067")));

                        resto = Restaurant.createPending(
                                        owner.getId(),
                                        "Burger & Bowl Co.",
                                        "Gourmet Smash Burgers, Thick Milkshakes, Crispy Fries & American Fast Food Staples.",
                                        new String[] { "American", "Burgers", "Fast Food", "Beverages" },
                                        addr,
                                        new BigDecimal("15.00"));
                        resto.approve();
                        resto.updateAvgRating(new BigDecimal("4.6"));
                        resto.setCoverImageKey(
                                        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800");
                        resto.setLogoImageKey(
                                        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800");
                        resto = restaurantRepository.save(resto);
                }

                if (!categoryRepository.findByRestaurantIdOrderByDisplayOrderAsc(resto.getId()).isEmpty()) {
                        return;
                }

                Category cat1 = categoryRepository.save(Category.create(resto.getId(), "Gourmet Burgers", 1));
                Category cat2 = categoryRepository.save(Category.create(resto.getId(), "Sides & Shakes", 2));

                createItem(resto.getId(), cat1.getId(), "Double Crunchy Chicken Burger",
                                "Crispy fried chicken breast, melted cheddar cheese, lettuce and spicy mayo in brioche bun.",
                                new BigDecimal("249.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Smash Veggie Deluxe Burger",
                                "Crispy vegetable patty, grilled halloumi, caramelized onions, pickles and secret burger sauce.",
                                new BigDecimal("189.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "BBQ Pulled Chicken Sandwich",
                                "Slow roasted pulled chicken in smoky BBQ sauce topped with apple coleslaw.",
                                new BigDecimal("229.00"),
                                false, "NON_VEG",
                                "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Classic Hot Dog Special",
                                "Grilled chicken frankfurter sausage served with yellow mustard, ketchup and relish.",
                                new BigDecimal("179.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?q=80&w=600");

                createItem(resto.getId(), cat2.getId(), "Loaded Cheese & Bacon Fries",
                                "Skin-on crispy french fries smothered in warm cheddar sauce and crispy turkey bacon bites.",
                                new BigDecimal("169.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1585109649139-366815a0d713?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Golden Crispy Onion Rings",
                                "Thick cut beer-battered onion rings served with ranch dipping sauce.",
                                new BigDecimal("120.00"), true,
                                "VEG", "https://images.unsplash.com/photo-1639024471283-03518883512d?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Thick Oreo Chocolate Shake",
                                "Creamy chocolate milk blended with dark Oreo cookies and topped with whipped cream.",
                                new BigDecimal("159.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Spicy Jalapeno Popper Bites",
                                "Cream cheese stuffed jalapenos breaded and deep fried till golden.",
                                new BigDecimal("149.00"), true,
                                "VEG", "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Cold Coffee with Ice Cream",
                                "Rich espresso blended with chilled milk and a scoop of dark chocolate ice cream.",
                                new BigDecimal("139.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Crispy Chicken Tenders (4pcs)",
                                "Hand-breaded juicy chicken strips served with honey mustard dip.",
                                new BigDecimal("199.00"), false,
                                "NON_VEG", "https://images.unsplash.com/photo-1562967914-608f82629710?q=80&w=600");
        }

        private void seedRestaurant4() {
                String phone = "+919800000004";
                UserCredential owner = userCredentialRepository.findByPhoneNumberAndUserType(phone, UserType.RESTAURANT)
                                .orElseGet(() -> userCredentialRepository
                                                .save(UserCredential.phoneSignup(phone, UserType.RESTAURANT)));

                Restaurant resto = restaurantRepository.findByOwnerUserCredentialId(owner.getId()).orElse(null);
                if (resto == null) {
                        RestaurantAddress addr = restaurantAddressRepository.save(RestaurantAddress.create(
                                        "80 Feet Road, HSR Layout", "Sector 1", "HSR Layout", "Bengaluru", "Karnataka",
                                        "India",
                                        "560102",
                                        "80 Feet Road, HSR Layout, Bengaluru - 560102", new BigDecimal("12.9121"),
                                        new BigDecimal("77.6446")));

                        resto = Restaurant.createPending(
                                        owner.getId(),
                                        "Asian Wok & Noodle House",
                                        "Authentic Pan-Asian Delights, Wok-tossed Noodles, Thai Curries & Handcrafted Dim Sums.",
                                        new String[] { "Asian", "Chinese", "Thai", "Seafood" },
                                        addr,
                                        new BigDecimal("15.00"));
                        resto.approve();
                        resto.updateAvgRating(new BigDecimal("4.8"));
                        resto.setCoverImageKey(
                                        "https://images.unsplash.com/photo-1617093727343-374698b1b08d?q=80&w=800");
                        resto.setLogoImageKey(
                                        "https://images.unsplash.com/photo-1617093727343-374698b1b08d?q=80&w=800");
                        resto = restaurantRepository.save(resto);
                }

                if (!categoryRepository.findByRestaurantIdOrderByDisplayOrderAsc(resto.getId()).isEmpty()) {
                        return;
                }

                Category cat1 = categoryRepository.save(Category.create(resto.getId(), "Noodles & Wok Bowls", 1));
                Category cat2 = categoryRepository.save(Category.create(resto.getId(), "Dim Sums & Starters", 2));

                createItem(resto.getId(), cat1.getId(), "Hakka Noodles Special",
                                "Classic stir-fried eggless noodles with shredded cabbage, bell peppers, carrots and soya seasoning.",
                                new BigDecimal("210.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1617093727343-374698b1b08d?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Schezwan Chicken Fried Rice",
                                "Wok-fried jasmine rice with diced chicken, scrambled egg and hot Schezwan pepper chili sauce.",
                                new BigDecimal("240.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Kung Pao Chicken Wok Bowl",
                                "Stir-fried chicken cubes with peanuts, green onions and dried red chili peppers over steamed rice.",
                                new BigDecimal("280.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=600");
                createItem(resto.getId(), cat1.getId(), "Thai Green Curry with Jasmine Rice",
                                "Aromatic coconut milk curry with eggplant, bamboo shoots, basil leaves and steamed jasmine rice.",
                                new BigDecimal("320.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?q=80&w=600");

                createItem(resto.getId(), cat2.getId(), "Vegetable Spring Rolls (4pcs)",
                                "Crispy golden fried rolls stuffed with glass noodles and crunchy Asian vegetables.",
                                new BigDecimal("160.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Steamed Chicken Dim Sums (6pcs)",
                                "Delicate transparent dumplings stuffed with minced chicken, ginger and sesame oil.",
                                new BigDecimal("220.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Honey Chili Crispy Potato",
                                "Double fried potato finger chips tossed in sweet honey chili glaze and toasted sesame seeds.",
                                new BigDecimal("175.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Chili Garlic Prawns Wok",
                                "Tiger prawns tossed in wok with minced garlic, crushed black pepper and green scallions.",
                                new BigDecimal("360.00"), false, "NON_VEG",
                                "https://images.unsplash.com/photo-1559742811-822863646df1?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Hot & Sour Manchow Soup",
                                "Spicy dark broth soup with minced vegetables, topped with crispy fried noodles.",
                                new BigDecimal("140.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=600");
                createItem(resto.getId(), cat2.getId(), "Mango Sticky Rice",
                                "Traditional Thai dessert of sweet sticky rice served with fresh mango slices and coconut cream.",
                                new BigDecimal("180.00"), true, "VEG",
                                "https://images.unsplash.com/photo-1621263764928-df1444c5e859?q=80&w=600");
        }

        private void createItem(UUID restoId, UUID catId, String name, String desc, BigDecimal price, boolean veg,
                        String foodType, String imgUrl) {
                MenuItem item = MenuItem.create(restoId, catId, name, desc, price, veg, foodType);
                item.setImageS3Key(imgUrl);
                menuItemRepository.save(item);
        }
}
